'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Circle, Star, Bot, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AgentWithCall } from '@/lib/db/types';

// Helper function to calculate duration from call
const calculateDuration = (call: AgentWithCall['current_call']): string => {
  if (!call?.startTime) return '-';
  const now = Math.floor(Date.now() / 1000);
  const elapsedSeconds = now - call.startTime;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

// Helper function to calculate duration in minutes
const calculateDurationMinutes = (call: AgentWithCall['current_call']): number | undefined => {
  if (!call?.startTime) return undefined;
  const now = Math.floor(Date.now() / 1000);
  const elapsedSeconds = now - call.startTime;
  return Math.floor(elapsedSeconds / 60);
};

// Helper function to calculate remaining duration
const calculateRemainingDuration = (call: AgentWithCall['current_call']): number | undefined => {
  if (!call?.startTime || !call?.expectedDuration) return undefined;
  const now = Math.floor(Date.now() / 1000);
  const elapsedSeconds = now - call.startTime;
  const remaining = call.expectedDuration - elapsedSeconds;
  return Math.max(0, remaining);
};

interface Agent extends AgentWithCall {
  sentiment?: string | null; // Optional sentiment score
}

interface AgentsTableProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  onAddAgent?: () => void;
  recommendedAgents?: number;
  onSignalAgent?: (agentId: string) => void;
}

type SortField = 'id' | 'type' | 'status' | 'callsHandled' | 'sentiment' | 'duration' | 'remainingDuration';
type SortDirection = 'asc' | 'desc' | null;

export function AgentsTable({ agents, onAgentClick, onAddAgent, recommendedAgents, onSignalAgent }: AgentsTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAgents = useMemo(() => {
    if (!sortField || !sortDirection) {
      return agents;
    }

    return [...agents].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'callsHandled':
          aValue = a.callsHandled;
          bValue = b.callsHandled;
          break;
        case 'sentiment':
          aValue = a.sentiment ? parseFloat(a.sentiment) : -1;
          bValue = b.sentiment ? parseFloat(b.sentiment) : -1;
          break;
        case 'duration':
          // Calculate duration from call
          aValue = calculateDurationMinutes(a.current_call) ?? 0;
          bValue = calculateDurationMinutes(b.current_call) ?? 0;
          break;
        case 'remainingDuration':
          aValue = calculateRemainingDuration(a.current_call) ?? -1;
          bValue = calculateRemainingDuration(b.current_call) ?? -1;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [agents, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-1" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4 ml-1" />;
    }
    return <ArrowUpDown className="w-4 h-4 ml-1" />;
  };

  // Helper function to format remaining duration
  const formatRemainingDuration = (remainingSeconds?: number): string => {
    if (remainingSeconds === undefined || remainingSeconds === null) {
      return '-';
    }
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/30 w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white text-xl">Active Agents</CardTitle>
        {onAddAgent && (
          <Button
            onClick={onAddAgent}
            className="bg-white text-black hover:bg-white/90 flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            New Voice Agent
            {recommendedAgents !== undefined && recommendedAgents > 0 && (
              <span className="text-xs opacity-70">(+{recommendedAgents} recommended)</span>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <Table className="min-w-full text-base">
            <TableHeader>
              <TableRow className="border-white/30 hover:bg-transparent">
                <TableHead className="text-white/80 font-semibold py-4 px-4">
                  <button
                    onClick={() => handleSort('id')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Agent ID
                    <SortIcon field="id" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold py-4 px-4">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Type
                    <SortIcon field="type" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold py-4 px-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold py-4 px-4">
                  <button
                    onClick={() => handleSort('callsHandled')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Calls
                    <SortIcon field="callsHandled" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold py-4 px-4">
                  <button
                    onClick={() => handleSort('sentiment')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Sentiment
                    <SortIcon field="sentiment" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold py-4 px-4">
                  <button
                    onClick={() => handleSort('duration')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Duration
                    <SortIcon field="duration" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold py-4 px-4">
                  <button
                    onClick={() => handleSort('remainingDuration')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Est. Remaining
                    <SortIcon field="remainingDuration" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold py-4 px-4 w-20">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAgents.map((agent, index) => {
                const durationMinutes = calculateDurationMinutes(agent.current_call);
                const isLongCall = durationMinutes !== undefined && durationMinutes >= 30;
                const isRedHighlight = agent.type === 'HUMAN' && isLongCall;
                const isSignaled = (agent as any).isSignaled;
                // Only show yellow blink if call is over 30 mins AND is signaled
                const shouldShowYellowBlink = isSignaled && isLongCall;

                const handleSignalClick = (e: React.MouseEvent) => {
                  e.stopPropagation(); // Prevent row click
                  if (onSignalAgent) {
                    onSignalAgent(agent.id);
                  }
                };

                return (
                  <TableRow
                    key={agent.id}
                    onClick={() => onAgentClick(agent)}
                    className={cn(
                      "border-white/10 cursor-pointer hover:bg-white/10 transition-colors",
                      shouldShowYellowBlink
                        ? 'bg-yellow-500/20 border-yellow-500/30 animate-pulse'
                        : isRedHighlight
                          ? 'bg-red-500/20 border-red-500/30'
                          : agent.status === 'ACTIVE'
                            ? 'bg-white/5'
                            : 'bg-white/2'
                    )}
                  >
                    <TableCell className="text-white font-mono flex items-center gap-2 py-4 px-4">
                      {agent.id}
                      {shouldShowYellowBlink && (
                        <AlertTriangle className="w-4 h-4 text-yellow-400 animate-pulse" />
                      )}
                      {isRedHighlight && !shouldShowYellowBlink && (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <span className="text-white/80">
                        {agent.type === 'HUMAN' ? 'Human' : 'AI'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-2",
                        agent.status === 'ACTIVE' ? 'text-white' : 'text-white/50'
                      )}>
                        <Circle
                          className={cn(
                            "w-3 h-3",
                            agent.status === 'ACTIVE' ? 'fill-white' : 'fill-white/30'
                          )}
                          stroke="none"
                        />
                        {agent.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-white py-4 px-4">{agent.callsHandled}</TableCell>
                    <TableCell className="text-white py-4 px-4">
                      {agent.sentiment ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-4 h-4 fill-white text-white" strokeWidth={1.5} />
                          {agent.sentiment}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-white py-4 px-4">
                      {calculateDuration(agent.current_call)}
                    </TableCell>
                    <TableCell className="text-white py-4 px-4">
                      {formatRemainingDuration(calculateRemainingDuration(agent.current_call))}
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      {agent.type === 'HUMAN' && agent.status === 'ACTIVE' && (
                        <button
                          onClick={handleSignalClick}
                          className="p-2 rounded hover:bg-white/10 transition-colors text-white"
                          title="Signal agent to close call ASAP"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
