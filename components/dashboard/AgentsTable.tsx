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
import { Circle, Star, Bot, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface AgentsTableProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  onAddAgent?: () => void;
  recommendedAgents?: number;
}

type SortField = 'id' | 'type' | 'status' | 'callsHandled' | 'sentiment' | 'duration';
type SortDirection = 'asc' | 'desc' | null;

export function AgentsTable({ agents, onAgentClick, onAddAgent, recommendedAgents }: AgentsTableProps) {
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
          // Sort by durationMinutes if available, otherwise parse duration string
          aValue = a.durationMinutes ?? (a.duration ? parseFloat(a.duration) : 0);
          bValue = b.durationMinutes ?? (b.duration ? parseFloat(b.duration) : 0);
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

  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Active Agents</CardTitle>
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
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/30 hover:bg-transparent">
                <TableHead className="text-white/80 font-semibold">
                  <button
                    onClick={() => handleSort('id')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Agent ID
                    <SortIcon field="id" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Type
                    <SortIcon field="type" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold">
                  <button
                    onClick={() => handleSort('callsHandled')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Calls
                    <SortIcon field="callsHandled" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold">
                  <button
                    onClick={() => handleSort('sentiment')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Sentiment
                    <SortIcon field="sentiment" />
                  </button>
                </TableHead>
                <TableHead className="text-white/80 font-semibold">
                  <button
                    onClick={() => handleSort('duration')}
                    className="flex items-center hover:text-white transition-colors"
                  >
                    Duration
                    <SortIcon field="duration" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAgents.map((agent, index) => {
                const isLongCall = agent.durationMinutes && agent.durationMinutes >= 30;
                const isRedHighlight = agent.type === 'HUMAN' && isLongCall;

                return (
                  <TableRow
                    key={agent.id}
                    onClick={() => onAgentClick(agent)}
                    className={cn(
                      "border-white/10 cursor-pointer hover:bg-white/10 transition-colors",
                      isRedHighlight
                        ? 'bg-red-500/20 border-red-500/30'
                        : agent.status === 'ACTIVE'
                          ? 'bg-white/5'
                          : 'bg-white/2'
                    )}
                  >
                    <TableCell className="text-white font-mono">{agent.id}</TableCell>
                    <TableCell>
                      <span className="text-white/80 text-sm">
                        {agent.type === 'HUMAN' ? 'Human' : 'AI'}
                      </span>
                    </TableCell>
                    <TableCell>
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
                    <TableCell className="text-white">{agent.callsHandled}</TableCell>
                    <TableCell className="text-white">
                      {agent.sentiment ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-4 h-4 fill-white text-white" strokeWidth={1.5} />
                          {agent.sentiment}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-white">{agent.duration}</TableCell>
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
