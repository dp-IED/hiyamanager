'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Circle, Star } from 'lucide-react';

interface Agent {
  id: string;
  type?: 'HUMAN' | 'AI';
  status: 'ACTIVE' | 'IDLE';
  callsHandled: number;
  sentiment: string | null;
  duration: string;
}

interface AgentDetailModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentDetailModal({ agent, open, onOpenChange }: AgentDetailModalProps) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-lg bg-black/95 border-white/30 text-white max-w-md">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

