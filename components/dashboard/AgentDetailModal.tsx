'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Circle, Star, Phone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallDetailCard } from './CallDetailCard';

interface Agent {
  id: string;
  type?: 'HUMAN' | 'AI';
  status: 'ACTIVE' | 'IDLE';
  callsHandled: number;
  sentiment: string | null;
  duration: string;
  isSignaled?: boolean;
}

interface Call {
  callId: string;
  time: string;
  agentId: string;
  type: 'Resolved' | 'Escalated';
  issue: string;
  duration: string;
  sentiment: string;
  customerPhone?: string;
  summary?: string;
  transcript?: string;
}

interface AgentDetailModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentDetailModal({ agent, open, onOpenChange }: AgentDetailModalProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [isSignaling, setIsSignaling] = useState(false);

  useEffect(() => {
    if (open && agent) {
      fetchCalls();
      checkSignaledStatus();
    }
  }, [open, agent]);

  const fetchCalls = async () => {
    setLoadingCalls(true);
    try {
      const response = await fetch('/api/agents/calls');
      const data = await response.json();
      // Filter calls for this agent
      const agentCalls = data.calls.filter((call: Call) => call.agentId === agent?.id);
      setCalls(agentCalls);
    } catch (error) {
      console.error('Failed to fetch calls:', error);
    } finally {
      setLoadingCalls(false);
    }
  };

  const checkSignaledStatus = async () => {
    if (!agent) return;
    try {
      const response = await fetch(`/api/agents/signal?agentId=${agent.id}`);
      const data = await response.json();
      // Update agent's signaled status would be handled by parent component
    } catch (error) {
      console.error('Failed to check signaled status:', error);
    }
  };

  const handleSignalAgent = async () => {
    if (!agent) return;
    setIsSignaling(true);
    try {
      const response = await fetch('/api/agents/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      });
      if (response.ok) {
        // Refresh to show signaled status
        await checkSignaledStatus();
      }
    } catch (error) {
      console.error('Failed to signal agent:', error);
    } finally {
      setIsSignaling(false);
    }
  };

  const handleAssignToBacklog = async (callId: string, agentId: string) => {
    try {
      const response = await fetch('/api/agents/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, agentId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Optionally show a success message or refresh the UI
        console.log('Agent assigned to backlog:', data);
        // You could add a toast notification here
      } else {
        throw new Error('Failed to assign agent to backlog');
      }
    } catch (error) {
      console.error('Failed to assign agent to backlog:', error);
      throw error;
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-lg bg-black/95 border-white/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{agent.id} Details</DialogTitle>
          <DialogDescription className="text-white/70">
            Comprehensive agent performance metrics
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/10 border border-white/30">
              <div className="text-sm text-white/70 mb-1">Type</div>
              <div className="text-lg font-semibold text-white">
                {agent.type || 'Unknown'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/30">
              <div className="text-sm text-white/70 mb-1">Status</div>
              <div className={`text-lg font-semibold inline-flex items-center gap-2 ${
                agent.status === 'ACTIVE' ? 'text-white' : 'text-white/50'
              }`}>
                <Circle 
                  className={`w-4 h-4 ${agent.status === 'ACTIVE' ? 'fill-white' : 'fill-white/30'}`} 
                  stroke="none"
                />
                {agent.status}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/30">
              <div className="text-sm text-white/70 mb-1">Calls Handled</div>
              <div className="text-lg font-semibold text-white">{agent.callsHandled}</div>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/30">
              <div className="text-sm text-white/70 mb-1">Avg Sentiment</div>
              <div className="text-lg font-semibold text-white inline-flex items-center gap-1">
                {agent.sentiment ? (
                  <>
                    <Star className="w-4 h-4 fill-white text-white" strokeWidth={1.5} />
                    {agent.sentiment}
                  </>
                ) : 'N/A'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-white/10 border border-white/30">
              <div className="text-sm text-white/70 mb-1">Avg Duration</div>
              <div className="text-lg font-semibold text-white">{agent.duration}</div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-white/10 border border-white/30">
            <div className="text-sm text-white/70 mb-2">Performance Summary</div>
            <div className="text-white/90 text-sm">
              {agent.status === 'ACTIVE' 
                ? `${agent.id} is actively handling customer calls with ${agent.callsHandled} calls processed. ${
                    agent.sentiment 
                      ? `Average sentiment score of ${agent.sentiment} indicates ${parseFloat(agent.sentiment) >= 4 ? 'excellent' : 'good'} customer satisfaction.`
                      : 'Sentiment data is being collected.'
                  }`
                : `${agent.id} is currently idle and ready to handle incoming calls.`
              }
            </div>
          </div>

          {/* Signal Agent Section */}
          {agent.status === 'ACTIVE' && agent.type === 'HUMAN' && (
            <div className={`p-4 rounded-lg border ${
              agent.isSignaled 
                ? 'bg-yellow-500/20 border-yellow-500/30' 
                : 'bg-white/10 border-white/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {agent.isSignaled && (
                    <AlertTriangle className="w-5 h-5 text-yellow-400 animate-pulse" />
                  )}
                  <div>
                    <div className="text-sm text-white/70 mb-1">
                      {agent.isSignaled ? 'Agent Signaled' : 'Agent Actions'}
                    </div>
                    <div className="text-xs text-white/60">
                      {agent.isSignaled 
                        ? 'Agent has been signaled to close call ASAP due to increasing wait times'
                        : 'Signal agent to close current call if situation is worsening'}
                    </div>
                  </div>
                </div>
                {!agent.isSignaled && (
                  <Button
                    onClick={handleSignalAgent}
                    disabled={isSignaling}
                    className="bg-yellow-500 text-black hover:bg-yellow-400 text-xs px-3 py-1 h-auto"
                    size="sm"
                  >
                    {isSignaling ? 'Signaling...' : 'Signal Agent'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Call History Section */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-white/70" />
              <h3 className="text-lg font-semibold text-white">Recent Calls</h3>
            </div>
            {loadingCalls ? (
              <div className="text-white/70 text-sm">Loading calls...</div>
            ) : calls.length > 0 ? (
              <div className="space-y-3">
                {calls.map((call) => (
                  <CallDetailCard 
                    key={call.callId} 
                    call={call}
                    onAssignToBacklog={handleAssignToBacklog}
                  />
                ))}
              </div>
            ) : (
              <div className="text-white/70 text-sm p-4 rounded-lg bg-white/5 border border-white/10">
                No recent calls found for this agent.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

