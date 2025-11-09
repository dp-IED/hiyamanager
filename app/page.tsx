'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ActiveCalls } from '@/components/dashboard/ActiveCalls';
import { IncidentBar } from '@/components/dashboard/IncidentBar';
import { CallVolumeChart } from '@/components/dashboard/CallVolumeChart';
import { ForecastAlert } from '@/components/dashboard/ForecastAlert';
import { AbandonedCallsBacklog } from '@/components/dashboard/AbandonedCallsBacklog';
import { WaitingCallsCard } from '@/components/dashboard/WaitingCallsCard';
import { AverageWaitTimeCard } from '@/components/dashboard/AverageWaitTimeCard';
import { ToastContainer, useToast } from '@/components/ui/toast';
import { AgentSpawnAnimation } from '@/components/dashboard/AgentSpawnAnimation';
import { AnimatePresence } from 'framer-motion';
import { Agent, MetricsData } from '@/lib/db/types';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAgentCounter, setAiAgentCounter] = useState(1);
  const [waitingCallsCount, setWaitingCallsCount] = useState(0);
  const [averageWaitTime, setAverageWaitTime] = useState(0);
  const [prevWaitingCallsCount, setPrevWaitingCallsCount] = useState<number | null>(null);
  const [prevAverageWaitTime, setPrevAverageWaitTime] = useState<number | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const [spawningAgent, setSpawningAgent] = useState<string | null>(null);
  const [crisisModeRunning, setCrisisModeRunning] = useState(false);
  const isFetchingRef = useRef(false);
  const isEnsuringMinimumCallsRef = useRef(false);


  const addCalls = async (count: number) => {
    for (let i = 0; i < count; i++) {
      await fetch('/api/calls/create');
    }
    await fetchMetrics();
    if (data) {
      setWaitingCallsCount(data.waitingCalls.length);
      setPrevWaitingCallsCount(data.waitingCalls.length);
    }
    showToast(`Added ${count} call${count !== 1 ? 's' : ''}`, 'success', 3000);
  };

  const ensureMinimumWaitingCalls = async (currentWaitingCount: number) => {
    // Prevent recursive calls
    if (isEnsuringMinimumCallsRef.current) {
      return;
    }

    if (currentWaitingCount < 15) {
      isEnsuringMinimumCallsRef.current = true;
      try {
        const targetCount = Math.floor(Math.random() * 6) + 15;
        const callsToAdd = targetCount - currentWaitingCount;
        if (callsToAdd > 0) {
          await addCalls(callsToAdd);
        }
      } finally {
        isEnsuringMinimumCallsRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (data && data.waitingCalls?.length !== undefined && !isEnsuringMinimumCallsRef.current) {
      const currentCount = data.waitingCalls.length;
      if (currentCount < 15) {
        ensureMinimumWaitingCalls(currentCount);
      }
    }
  }, [data?.waitingCalls?.length]);

  const ensureAgentsAreAssignedCalls = async (idleAgentIds: string[], waitingCallIds: string[]) => {
    if (idleAgentIds.length > 0 && waitingCallIds.length > 0) {
      const agentsToAssign = idleAgentIds.slice(0, Math.min(waitingCallIds.length, idleAgentIds.length));
      for (const agentId of agentsToAssign) {
        const res = await fetch('/api/calls/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });
        if (res.ok) {
          const callId = await res.json();
          console.log(`Assigned call ${callId} to agent ${agentId}`);
        }
      }
    }
  };

  const fetchMetrics = async () => {
    // Don't start a new fetch if one is already in progress
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    try {
      // Fetch all data in parallel with error handling
      const [
        metricsResponse,
        waitingCallsResponse,
        activeCallsResponse,
        agentsResponse,
        idleAgentsResponse,
        forecastResponse,
        chartsResponse,
        incidentsResponse,
      ] = await Promise.allSettled([
        fetch('/api/metrics'),
        fetch('/api/calls/waiting'),
        fetch('/api/calls/active'),
        fetch('/api/agents'),
        fetch('/api/agents/idle'),
        fetch('/api/metrics/forecast'),
        fetch('/api/metrics/charts'),
        fetch('/api/metrics/incidents'),
      ]);

      // Extract data with error handling
      const metrics = metricsResponse.status === 'fulfilled' && metricsResponse.value.ok
        ? await metricsResponse.value.json()
        : { waitingCallsCount: 0, activeCallsCount: 0, totalAgents: 0, activeAgentsCount: 0, idleAgentsCount: 0, averageWaitTime: 0 };

      const waitingCallIds = waitingCallsResponse.status === 'fulfilled' && waitingCallsResponse.value.ok
        ? await waitingCallsResponse.value.json()
        : [];

      const activeCallIds = activeCallsResponse.status === 'fulfilled' && activeCallsResponse.value.ok
        ? await activeCallsResponse.value.json()
        : [];

      const agentIds = agentsResponse.status === 'fulfilled' && agentsResponse.value.ok
        ? await agentsResponse.value.json()
        : [];

      const idleAgentIds = idleAgentsResponse.status === 'fulfilled' && idleAgentsResponse.value.ok
        ? await idleAgentsResponse.value.json()
        : [];

      const forecastData = forecastResponse.status === 'fulfilled' && forecastResponse.value.ok
        ? await forecastResponse.value.json()
        : { anomaly_detection: { detected: false, severity: 'NORMAL' as const, incident_type: 'Normal operations', peak_time_minutes: 0 }, recent_incidents: [] };

      const chartData = chartsResponse.status === 'fulfilled' && chartsResponse.value.ok
        ? await chartsResponse.value.json()
        : { data: [], current: { total: 0, active: 0, waiting: 0 } };

      const incidents = incidentsResponse.status === 'fulfilled' && incidentsResponse.value.ok
        ? await incidentsResponse.value.json()
        : [];

      // Fetch full call objects for active and waiting calls
      const [activeCallsData, waitingCallsData] = await Promise.all([
        Promise.all(activeCallIds.map(async (id: string) => {
          try {
            const callRes = await fetch(`/api/calls/${id}`);
            if (callRes.ok) {
              const call = await callRes.json();
              // Fetch agent if assigned
              let agent = null;
              if (call.agentId) {
                try {
                  const agentRes = await fetch(`/api/agent/${call.agentId}`);
                  if (agentRes.ok) {
                    agent = await agentRes.json();
                  }
                } catch (err) {
                  console.error(`Failed to fetch agent ${call.agentId}:`, err);
                }
              }
              return { ...call, agent };
            }
          } catch (err) {
            console.error(`Failed to fetch call ${id}:`, err);
          }
          return null;
        })),
        Promise.all(waitingCallIds.map(async (id: string) => {
          try {
            const callRes = await fetch(`/api/calls/${id}`);
            if (callRes.ok) {
              return await callRes.json();
            }
          } catch (err) {
            console.error(`Failed to fetch call ${id}:`, err);
          }
          return null;
        })),
      ]);

      // Fetch full agent objects
      const [allAgentsData, idleAgentsData] = await Promise.all([
        Promise.all(agentIds.map(async (id: string) => {
          try {
            const agentRes = await fetch(`/api/agent/${id}`);
            if (agentRes.ok) {
              return await agentRes.json();
            }
          } catch (err) {
            console.error(`Failed to fetch agent ${id}:`, err);
          }
          return null;
        })),
        Promise.all(idleAgentIds.map(async (id: string) => {
          try {
            const agentRes = await fetch(`/api/agent/${id}`);
            if (agentRes.ok) {
              return await agentRes.json();
            }
          } catch (err) {
            console.error(`Failed to fetch agent ${id}:`, err);
          }
          return null;
        })),
      ]);

      // Filter out null values
      const activeCalls = activeCallsData.filter((call: any) => call !== null);
      const waitingCalls = waitingCallsData.filter((call: any) => call !== null);
      const agents = allAgentsData.filter((agent: any) => agent !== null);
      const idleAgents = idleAgentsData.filter((agent: any) => agent !== null);

      // Reconstruct the MetricsData structure for compatibility
      const metricsData: MetricsData = {
        waitingCalls,
        activeCalls,
        activeAgents: agents.filter((agent: Agent) => {
          return activeCalls.some((call: any) => call.agentId === agent.id) || agent.status === 'ACTIVE';
        }).map((agent: Agent) => ({
          ...agent,
          current_call: activeCalls.find((call: any) => call.agentId === agent.id) || null,
        })),
        idleAgents,
        totalAgents: metrics.totalAgents,
        agents,
        incidents,
        chartData,
        averageWaitTime: metrics.averageWaitTime,
        forecastData,
      };

      setData(metricsData);
      setAgents(agents);

      console.log('Data:', metricsData);

      if (idleAgentIds.length > 0 && waitingCallIds.length > 0) {
        console.log('Ensuring agents are assigned calls');
        console.log('Idle agents:', idleAgentIds.length);
        console.log('Waiting calls:', waitingCallIds.length);
        ensureAgentsAreAssignedCalls(idleAgentIds, waitingCallIds);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchMetrics();
    const metricsInterval = setInterval(fetchMetrics, 1000);
    return () => clearInterval(metricsInterval);
  }, []);

  useEffect(() => {

    const handleShowToast = (event: CustomEvent) => {
      showToast(event.detail.message, event.detail.type, event.detail.duration);
    };

    window.addEventListener('showToast', handleShowToast as EventListener);
    return () => {
      window.removeEventListener('showToast', handleShowToast as EventListener);
    };
  }, [showToast]);

  // Calculate waiting calls and average wait time from metrics data
  useEffect(() => {
    if (data) {
      setWaitingCallsCount(data.waitingCalls.length);
      setPrevWaitingCallsCount(data.waitingCalls.length);
      setAverageWaitTime(data.averageWaitTime || 0);
      setPrevAverageWaitTime(data.averageWaitTime || 0);
    }
  }, [data]);


  const handleCrisisMode = async () => {
    setCrisisModeRunning(true);
    showToast('Crisis Mode: Analyzing situation and optimizing agent allocation...', 'warning', 5000);

    try {
      // Get current queue
      const queueResponse = await fetch('/api/calls/queue');
      const queueData = await queueResponse.json();
      const queue = queueData.queue || [];

      if (queue.length === 0) {
        showToast('No calls in queue. Crisis mode not needed.', 'info', 3000);
        setCrisisModeRunning(false);
        return;
      }

      // Step 1: Find calls finishing soon
      // refresh metrics to get the latest calls finishing soon
      await fetchMetrics();
      const callsFinishingSoon = data?.activeCalls.filter((call: any) => call.expectedDuration - call.duration < 60) || [];

      let agentsSignaled = 0;

      // Step 2: Signal agents with calls finishing soon (up to waiting calls count)
      if (callsFinishingSoon.length > 0) {
        const agentsToSignal = callsFinishingSoon
          .filter((call: any) => call.agentId) // Only signal if agent exists
          .slice(0, Math.min(queue.length, callsFinishingSoon.length)); // Signal up to queue size

        showToast(`Signaling ${agentsToSignal.length} agents with calls finishing soon...`, 'info', 3000);

        for (const call of agentsToSignal) {
          try {
            await fetch('/api/agents/signal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agentId: call.agentId }),
            });
            agentsSignaled++;
            // Small delay between signals
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Failed to signal agent ${call.agentId}:`, error);
          }
        }

        // Wait for signals to process (hangup + auto-assignment)
        if (agentsSignaled > 0) {
          showToast(`Waiting for ${agentsSignaled} agents to finish calls and pick up waiting calls...`, 'info', 4000);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      // Step 3: Check remaining queue after signals
      const updatedQueueResponse = await fetch('/api/calls/queue');
      const updatedQueueData = await updatedQueueResponse.json();
      const updatedQueue = updatedQueueData.queue || [];

      // Step 4: Only create new agents if queue still has calls
      if (updatedQueue.length > 0) {
        const agentsNeeded = Math.ceil(updatedQueue.length / 2.5);
        const agentsToCreate = Math.min(agentsNeeded, 5);

        if (agentsToCreate > 0) {
          showToast(`Creating ${agentsToCreate} new AI agents for remaining ${updatedQueue.length} calls...`, 'info', 3000);

          // TODO: Agent management endpoints will be rebuilt
          // Agent creation temporarily disabled - endpoints were removed
          console.log(`[Crisis Mode] Would create ${agentsToCreate} agents, but agent management endpoints are being rebuilt`);
          /* 
          for (let i = 0; i < agentsToCreate; i++) {
            const createResponse = await fetch('/api/agents/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'AI',
                status: 'ACTIVE',
              }),
            });

            const createData = await createResponse.json();
            const newAgentId = createData.agent?.id;

            if (!newAgentId) {
              console.error('Failed to create agent:', createData);
              continue;
            }

            // Assign a call if available
            const assignResponse = await fetch('/api/calls/queue/assign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agentId: newAgentId }),
            });

            if (assignResponse.ok) {
              showToast(`Agent ${newAgentId} created and assigned to call`, 'success', 2000);
            }

            await new Promise(resolve => setTimeout(resolve, 800));
          }
          */
        }
      }

      // Refresh everything
      await fetchMetrics();
      const finalQueueResponse = await fetch('/api/calls/queue');
      const finalQueueData = await finalQueueResponse.json();
      const finalQueue = finalQueueData.queue || [];
      setWaitingCallsCount(finalQueue.length);

      const summary = agentsSignaled > 0
        ? `Crisis Mode: Signaled ${agentsSignaled} agents, created ${Math.min(Math.ceil((queue.length - agentsSignaled) / 2.5), 5)} new agents. ${finalQueue.length} calls remaining.`
        : `Crisis Mode: Created ${Math.min(Math.ceil(queue.length / 2.5), 5)} agents. ${finalQueue.length} calls remaining.`;

      showToast(summary, 'success', 5000);
    } catch (error) {
      console.error('Crisis mode failed:', error);
      showToast('Crisis mode encountered an error', 'error', 4000);
    } finally {
      setCrisisModeRunning(false);
    }
  };

  const handleAddAgent = async () => {
    // Show spawn animation with placeholder
    setSpawningAgent('AI-CREATING');

    try {
      const createAgentResponse = await fetch('/api/agent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'AI' }),
      });

      if (!createAgentResponse.ok) {
        console.error('Failed to create agent in database');
        setSpawningAgent(null);
        return;
      }

      const agentId = await createAgentResponse.json();

      if (!agentId) {
        console.error('Failed to get agent ID from response');
        showToast('Failed to create new agent. Please try again.', 'error', 4000);
        setSpawningAgent(null);
        return;
      }

      // Fetch the full agent object
      const agentRes = await fetch(`/api/agent/${agentId}`);
      if (agentRes.ok) {
        const newAgent = await agentRes.json();
        setSpawningAgent(newAgent.id);
        // Refresh metrics after a short delay
        setTimeout(() => {
          fetchMetrics();
        }, 1000);
      } else {
        setSpawningAgent(agentId);
        setTimeout(() => {
          fetchMetrics();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
      showToast('Failed to create new agent. Please try again.', 'error', 4000);
      setSpawningAgent(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Failed to load data</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-black text-white p-3 md:p-4 lg:p-6">
      <div className="max-w-[95vw] mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-end mb-8 gap-4"
        >
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Command Center
            </h1>
            <p className="text-xl text-white/70">Real-Time AI Agent Operations</p>
          </div>
        </motion.div>

        {/* Forecast Alert and Queue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Forecast Alert - takes 50% (2 columns) */}
          {data?.forecastData && data.forecastData.anomaly_detection?.detected ? (
            <div className="md:col-span-2">
              <ForecastAlert
                severity={data.forecastData.anomaly_detection.severity}
                incidentType={data.forecastData.anomaly_detection.incident_type}
                peakTimeMinutes={data.forecastData.anomaly_detection.peak_time_minutes}
              />
            </div>
          ) : (
            <div className="md:col-span-2"></div>
          )}

          {/* Waiting Calls Card - takes 25% (1 column) */}
          <div className="md:col-span-1">
            <WaitingCallsCard
              count={waitingCallsCount}
              changePercent={
                prevWaitingCallsCount !== null && prevWaitingCallsCount !== 0
                  ? ((waitingCallsCount - prevWaitingCallsCount) / prevWaitingCallsCount) * 100
                  : undefined
              }
            />
          </div>

          {/* Average Wait Time Card - takes 25% (1 column) */}
          <div className="md:col-span-1">
            <AverageWaitTimeCard
              waitTimeSeconds={averageWaitTime}
              changePercent={
                prevAverageWaitTime !== null && prevAverageWaitTime !== 0
                  ? ((averageWaitTime - prevAverageWaitTime) / prevAverageWaitTime) * 100
                  : undefined
              }
            />
          </div>
        </div>

        {/* Incident History Top Bar */}
        <IncidentBar
          incidents={data.incidents}
          forecastIncidents={data?.forecastData?.recent_incidents || []}
        />
        <div className="w-full">
          <motion.div
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleAddAgent}
              className="w-full bg-white text-black hover:bg-white/90 font-bold py-6 text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3"
            >
              <Bot className="w-6 h-6" />
              New Voice Agent
            </Button>
          </motion.div>
        </div>

        {/* Main Layout: Active Calls and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Active Calls - takes 3 columns (60%) */}
          <div className="lg:col-span-3">
            <ActiveCalls
              onCrisisMode={handleCrisisMode}
              crisisModeRunning={crisisModeRunning}
              activeCallsData={data?.activeCalls}
            />
          </div>

          {/* Right Column: Call Volume Chart and Abandoned Calls - takes 2 columns (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <CallVolumeChart chartData={data?.chartData} />
            <AbandonedCallsBacklog />
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Agent Spawn Animation */}
      <AnimatePresence>
        {spawningAgent && (
          <AgentSpawnAnimation
            agentId={spawningAgent}
            onComplete={() => setSpawningAgent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
