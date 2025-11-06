'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { ActiveCalls } from '@/components/dashboard/ActiveCalls';
import { IncidentBar } from '@/components/dashboard/IncidentBar';
import { CallVolumeChart } from '@/components/dashboard/CallVolumeChart';
import { ForecastAlert } from '@/components/dashboard/ForecastAlert';
import { AbandonedCallsBacklog } from '@/components/dashboard/AbandonedCallsBacklog';
import { WaitingCallsCard } from '@/components/dashboard/WaitingCallsCard';
import { AverageWaitTimeCard } from '@/components/dashboard/AverageWaitTimeCard';
import { Button } from '@/components/ui/button';
import { ToastContainer, useToast } from '@/components/ui/toast';
import { AgentSpawnAnimation } from '@/components/dashboard/AgentSpawnAnimation';
import { CrisisModeDemo } from '@/components/dashboard/CrisisModeDemo';
import { AnimatePresence } from 'framer-motion';

interface Agent {
  id: string;
  type: 'HUMAN' | 'AI';
  status: 'ACTIVE' | 'IDLE';
  callsHandled: number;
  sentiment: string | null;
  duration: string;
  durationMinutes?: number;
  startTime?: number;
  isSignaled?: boolean;
}

interface MetricsData {
  callsBeingHandled: number;
  activeAgents: number;
  idleAgents: number;
  totalAgents: number;
  agents: Agent[];
  incidents: Array<{
    id: string;
    title: string;
  }>;
}

interface ForecastData {
  current_state: {
    calls_per_hour: number;
    avg_last_6_hours: number;
    agents_online: number;
  };
  forecast: Array<{
    hour: number;
    predicted_calls: number;
  }>;
  anomaly_detection: {
    detected: boolean;
    severity: 'CRITICAL' | 'HIGH' | 'NORMAL';
    incident_type: string;
    peak_calls: number;
    peak_time_minutes: number;
    spike_factor: string;
    confidence: number;
  };
  provisioning: {
    required_agents: number;
    ai_agents_to_provision: number;
    human_agents_needed: number;
    response_time_minutes: number;
    recommended_action: string;
    estimated_peak_time: string;
  };
  recent_incidents: Array<{
    time: Date | string;
    description: string;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAgentCounter, setAiAgentCounter] = useState(1);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [waitingCallsCount, setWaitingCallsCount] = useState(0);
  const [averageWaitTime, setAverageWaitTime] = useState(0);
  const [prevWaitingCallsCount, setPrevWaitingCallsCount] = useState<number | null>(null);
  const [prevAverageWaitTime, setPrevAverageWaitTime] = useState<number | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const [spawningAgent, setSpawningAgent] = useState<string | null>(null);
  const [crisisModeRunning, setCrisisModeRunning] = useState(false);

  // Fetch initial metrics data
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/agents/metrics');
      const metricsData = await response.json();
      setData(metricsData);
      setAgents(metricsData.agents);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Listen for agent status changes (e.g., after signaling)
  useEffect(() => {
    const handleAgentStatusChange = () => {
      // Refresh metrics after a short delay to allow backend to process
      setTimeout(() => {
        fetchMetrics();
      }, 3500); // 3.5 seconds to allow hangup + auto-assignment
    };

    const handleShowToast = (event: CustomEvent) => {
      showToast(event.detail.message, event.detail.type, event.detail.duration);
    };

    window.addEventListener('agentSignaled', handleAgentStatusChange);
    window.addEventListener('showToast', handleShowToast as EventListener);
    return () => {
      window.removeEventListener('agentSignaled', handleAgentStatusChange);
      window.removeEventListener('showToast', handleShowToast as EventListener);
    };
  }, [showToast]);

  // Fetch forecast data
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await fetch('/api/forecast');
        const forecast = await response.json();
        setForecastData(forecast);

      } catch (error) {
        console.error('Failed to fetch forecast:', error);
      }
    };

    fetchForecast();
    // Poll every 30 seconds for forecast updates
    const forecastInterval = setInterval(fetchForecast, 30000);
    return () => clearInterval(forecastInterval);
  }, [agents]);

  // Fetch queue data for waiting calls
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const response = await fetch('/api/calls/queue');
        const data = await response.json();
        const queue = data.queue || [];

        // Calculate waiting calls count
        const count = queue.length;

        // Calculate average wait time
        // queuedAt is now a Unix timestamp (number in seconds) from database
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        let totalWaitTime = 0;
        queue.forEach((call: any) => {
          // Handle both Unix timestamp (number) and Date string formats
          const queuedAt = typeof call.queuedAt === 'number'
            ? call.queuedAt
            : Math.floor(new Date(call.queuedAt).getTime() / 1000);
          const waitTime = now - queuedAt; // in seconds
          totalWaitTime += waitTime;
        });
        const avgWaitTime = queue.length > 0 ? Math.floor(totalWaitTime / queue.length) : 0;

        // Update previous values before setting new ones (using functional updates)
        setWaitingCallsCount((current) => {
          if (current !== count) {
            setPrevWaitingCallsCount(current);
          }
          return count;
        });

        setAverageWaitTime((current) => {
          if (current !== avgWaitTime) {
            setPrevAverageWaitTime(current);
          }
          return avgWaitTime;
        });
      } catch (error) {
        console.error('Failed to fetch queue:', error);
      }
    };

    fetchQueue();
    // Poll every 5 seconds for queue updates
    const queueInterval = setInterval(fetchQueue, 5000);
    return () => clearInterval(queueInterval);
  }, []);

  // Auto-complete expired calls (poll every 10 seconds)
  useEffect(() => {
    const checkAndCompleteCalls = async () => {
      try {
        const response = await fetch('/api/calls/auto-complete', {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.completedCalls && data.completedCalls.length > 0) {
            // Refresh metrics and active calls after completion
            fetchMetrics();
            // Dispatch event to refresh active calls
            window.dispatchEvent(new CustomEvent('callsCompleted', {
              detail: { count: data.completedCalls.length }
            }));
          }
        }
      } catch (error) {
        console.error('Failed to auto-complete calls:', error);
      }
    };

    checkAndCompleteCalls();
    const autoCompleteInterval = setInterval(checkAndCompleteCalls, 10000); // Every 10 seconds
    return () => clearInterval(autoCompleteInterval);
  }, []);

  // Update agent durations every second (faster progression for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prevAgents) => {
        return prevAgents.map((agent) => {
          if (agent.startTime) {
            // Faster progression: multiply elapsed time by 5x for demo
            const elapsedSeconds = Math.floor((Date.now() - agent.startTime) / 1000) * 5;
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            return {
              ...agent,
              duration: `${minutes}m ${seconds}s`,
              durationMinutes: minutes,
            };
          }
          return agent;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  const handleStartDemo = async () => {
    try {
      // Start demo state
      await fetch('/api/demo/start', { method: 'POST' });

      // Ensure all human agents are active with long calls
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.type === 'HUMAN') {
            return {
              ...agent,
              status: 'ACTIVE' as const,
              durationMinutes: 30 + Math.floor(Math.random() * 10),
              duration: `${30 + Math.floor(Math.random() * 10)}m`,
            };
          }
          return agent;
        })
      );

      // Trigger forecast to show anomaly
      const forecastResponse = await fetch('/api/forecast');
      const forecast = await forecastResponse.json();
      setForecastData(forecast);
    } catch (error) {
      console.error('Failed to start demo:', error);
    }
  };

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
      const finishingSoonResponse = await fetch('/api/calls/auto-complete');
      const finishingSoonData = await finishingSoonResponse.json();
      const callsFinishingSoon = finishingSoonData.callsFinishingSoon || [];

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

          for (let i = 0; i < agentsToCreate; i++) {
            const newAgentId = `AI-${String(aiAgentCounter + i).padStart(3, '0')}`;

            // Create agent
            await fetch('/api/agents/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: newAgentId,
                type: 'AI',
                status: 'ACTIVE',
              }),
            });

            // Create VAPI assistant
            try {
              await fetch('/api/vapi/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  agentId: newAgentId,
                  name: `AI Agent ${newAgentId}`,
                }),
              });
            } catch (error) {
              console.error('Failed to create assistant:', error);
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

            // Small delay between agent creations for visual effect
            await new Promise(resolve => setTimeout(resolve, 800));
          }

          // Update counter
          setAiAgentCounter((prev) => prev + agentsToCreate);
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
    const newAgentId = `AI-${String(aiAgentCounter).padStart(3, '0')}`;

    // Show spawn animation
    setSpawningAgent(newAgentId);

    try {
      // Create agent in database first
      const createAgentResponse = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newAgentId,
          type: 'AI',
          status: 'ACTIVE',
        }),
      });

      if (!createAgentResponse.ok) {
        console.error('Failed to create agent in database');
        return;
      }

      // Create Vapi assistant for this agent
      try {
        const assistantResponse = await fetch('/api/vapi/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: newAgentId,
            name: `AI Agent ${newAgentId}`,
          }),
        });

        if (assistantResponse.ok) {
          const assistantData = await assistantResponse.json();
          console.log(`Vapi assistant created for ${newAgentId}:`, assistantData.assistant?.id);
        }
      } catch (error) {
        console.error('Failed to create Vapi assistant:', error);
        // Continue anyway for demo
      }

      // Check if there are waiting calls to assign
      const queueResponse = await fetch('/api/calls/queue');
      const queueData = await queueResponse.json();
      const queue = queueData.queue || [];

      if (queue.length > 0) {
        // Assign the oldest waiting call to the new agent
        const assignResponse = await fetch('/api/calls/queue/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: newAgentId }),
        });

        if (assignResponse.ok) {
          const assignData = await assignResponse.json();
          const assignedCall = assignData.assignedCall;
          console.log(`Assigned waiting call to ${newAgentId}`, assignedCall);

          // Show success toast
          showToast(
            `Agent ${newAgentId} created and assigned to call ${assignedCall.customerPhone}`,
            'success',
            4000
          );

          // Refetch queue to update counts
          const updatedQueueResponse = await fetch('/api/calls/queue');
          const updatedQueueData = await updatedQueueResponse.json();
          const updatedQueue = updatedQueueData.queue || [];

          // Update waiting calls count
          const newCount = updatedQueue.length;
          setPrevWaitingCallsCount(waitingCallsCount);
          setWaitingCallsCount(newCount);

          // Recalculate average wait time
          if (updatedQueue.length > 0) {
            const now = Math.floor(Date.now() / 1000);
            let totalWaitTime = 0;
            updatedQueue.forEach((call: any) => {
              const queuedAt = typeof call.queuedAt === 'number'
                ? call.queuedAt
                : Math.floor(new Date(call.queuedAt).getTime() / 1000);
              const waitTime = now - queuedAt;
              totalWaitTime += waitTime;
            });
            const newAvgWaitTime = Math.floor(totalWaitTime / updatedQueue.length);
            setPrevAverageWaitTime(averageWaitTime);
            setAverageWaitTime(newAvgWaitTime);
          } else {
            setPrevAverageWaitTime(averageWaitTime);
            setAverageWaitTime(0);
          }

          // Dispatch event with call data for client-side tracking
          const callStartTime = assignedCall.assignedAt
            ? (typeof assignedCall.assignedAt === 'number'
              ? assignedCall.assignedAt * 1000
              : new Date(assignedCall.assignedAt).getTime())
            : Date.now();

          window.dispatchEvent(new CustomEvent('callAssigned', {
            detail: {
              id: assignedCall.id,
              customerPhone: assignedCall.customerPhone,
              agentId: newAgentId,
              agentType: 'AI',
              callStartTime: callStartTime,
              isCallback: true,
              issue: assignedCall.issue,
            }
          }));
        }
      }

      // Refresh agents list from database
      const metricsResponse = await fetch('/api/agents/metrics');
      const metricsData = await metricsResponse.json();
      setAgents(metricsData.agents || []);
      setAiAgentCounter((prev) => prev + 1);

      // Hide spawn animation after a delay
      setTimeout(() => {
        setSpawningAgent(null);
      }, 2000);

      if (queue.length === 0) {
        showToast(`Agent ${newAgentId} created and ready for calls`, 'info', 3000);
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
          {forecastData && forecastData.anomaly_detection.detected ? (
            <div className="md:col-span-2">
              <ForecastAlert
                severity={forecastData.anomaly_detection.severity}
                incidentType={forecastData.anomaly_detection.incident_type}
                peakTimeMinutes={forecastData.anomaly_detection.peak_time_minutes}
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
          forecastIncidents={forecastData?.recent_incidents || []}
        />
        <div className="w-full">
          <CrisisModeDemo
            onStart={handleCrisisMode}
            isRunning={crisisModeRunning}
          />
        </div>

        {/* Main Layout: Active Calls and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Active Calls - takes 3 columns (60%) */}
          <div className="lg:col-span-3">
            <ActiveCalls
              onAddAgent={handleAddAgent}
            />
          </div>

          {/* Right Column: Call Volume Chart and Abandoned Calls - takes 2 columns (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <CallVolumeChart forecastData={forecastData?.forecast} />
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
