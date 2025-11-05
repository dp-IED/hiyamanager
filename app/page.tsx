'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, Bot } from 'lucide-react';
import { StatusBar } from '@/components/dashboard/StatusBar';
import { AgentsTable } from '@/components/dashboard/AgentsTable';
import { ProvisioningTimeline } from '@/components/dashboard/ProvisioningTimeline';
import { IncidentBar } from '@/components/dashboard/IncidentBar';
import { CallVolumeChart } from '@/components/dashboard/CallVolumeChart';
import { AgentDetailModal } from '@/components/dashboard/AgentDetailModal';
import { ForecastAlert } from '@/components/dashboard/ForecastAlert';
import { ForecastMetrics } from '@/components/dashboard/ForecastMetrics';

interface Agent {
  id: string;
  type: 'HUMAN' | 'AI';
  status: 'ACTIVE' | 'IDLE';
  callsHandled: number;
  sentiment: string | null;
  duration: string;
  durationMinutes?: number;
  startTime?: number;
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

interface TimelineEvent {
  time: string;
  action: string;
  type: 'provision' | 'deprovision';
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
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiAgentCounter, setAiAgentCounter] = useState(1);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);

  // Fetch initial metrics data
  useEffect(() => {
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

    fetchMetrics();
  }, []);

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
  }, []);

  // Update AI agent durations every second
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prevAgents) => {
        return prevAgents.map((agent) => {
          if (agent.type === 'AI' && agent.startTime) {
            const elapsedSeconds = Math.floor((Date.now() - agent.startTime) / 1000);
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

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setModalOpen(true);
  };

  const handleAddAgent = () => {
    const now = Date.now();
    const newAgent: Agent = {
      id: `AI-${String(aiAgentCounter).padStart(3, '0')}`,
      type: 'AI',
      status: 'ACTIVE',
      callsHandled: 0,
      sentiment: null,
      duration: '0m 0s',
      durationMinutes: 0,
      startTime: now,
    };

    setAgents((prev) => [...prev, newAgent]);
    setAiAgentCounter((prev) => prev + 1);

    // Add timeline event
    const timeString = new Date(now).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const newTimelineEvent: TimelineEvent = {
      time: timeString,
      action: `AI Agent ${newAgent.id} provisioned`,
      type: 'provision',
    };
    setTimeline((prev) => [...prev, newTimelineEvent]);
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

  const activeAgents = agents.filter(a => a.status === 'ACTIVE').length;
  const aiAgents = agents.filter(a => a.type === 'AI').length;

  return (
    <div className="min-h-screen bg-black text-white p-3 md:p-4 lg:p-6">
      <div className="max-w-[95vw] mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-end mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-white">
            Command Center
          </h1>
          <p className="text-xl text-white/70">Real-Time AI Agent Operations</p>
        </motion.div>

        {/* Forecast Alert */}
        {forecastData && forecastData.anomaly_detection.detected && (
          <ForecastAlert
            severity={forecastData.anomaly_detection.severity}
            incidentType={forecastData.anomaly_detection.incident_type}
            peakTimeMinutes={forecastData.anomaly_detection.peak_time_minutes}
          />
        )}

        {/* Incident History Top Bar */}
        <IncidentBar
          incidents={data.incidents}
          forecastIncidents={forecastData?.recent_incidents || []}
        />

        {/* Main Layout: Agents Table Left, Chart + Status Bars Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Active Agents Table */}
          <div className="lg:col-span-1">
            <AgentsTable
              agents={agents}
              onAgentClick={handleAgentClick}
              onAddAgent={handleAddAgent}
              recommendedAgents={forecastData?.provisioning.ai_agents_to_provision}
            />
          </div>

          {/* Right: Chart, Status Bars, Forecast Metrics, and Provisioning Timeline */}
          <div className="lg:col-span-1 space-y-4">
            {/* Call Volume Chart */}
            <CallVolumeChart forecastData={forecastData?.forecast} />

            {/* Forecast Metrics */}
            {forecastData && (
              <ForecastMetrics
                currentCallsPerHour={forecastData.current_state.calls_per_hour}
                forecastedPeak={forecastData.anomaly_detection.peak_calls}
                peakTimeMinutes={forecastData.anomaly_detection.peak_time_minutes}
                recommendedAgents={forecastData.provisioning.ai_agents_to_provision}
              />
            )}

            {/* Status Bars */}
            <div className="grid grid-cols-1 gap-4">
              <StatusBar
                icon={Activity}
                label="LIVE STATUS"
                value={`${data.callsBeingHandled} Calls Being Handled | ${activeAgents} Operators Active`}
              />
              <StatusBar
                icon={Bot}
                label="AI Agents"
                value={`${aiAgents} AI Agents Active`}
              />
              <StatusBar
                icon={BarChart3}
                label="Human Operators"
                value={`15 Human Operators (All Occupied)`}
              />
            </div>

            {/* Provisioning Timeline */}
            <ProvisioningTimeline timeline={timeline} />
          </div>
        </div>
      </div>

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
