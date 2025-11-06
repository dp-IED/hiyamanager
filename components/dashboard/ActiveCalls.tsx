'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, ArrowUpDown, ArrowUp, ArrowDown, Bot, AlertTriangle, ChevronDown, ChevronUp, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CallDetailCard } from './CallDetailCard';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveCall {
  id: string;
  customerPhone: string;
  agentId: string;
  agentType: 'HUMAN' | 'AI';
  duration: string;
  durationSeconds?: number;
  startTime?: number;
  isCallback?: boolean;
  issue?: string;
  summary?: string;
  transcript?: string;
  expectedDuration?: number;
  remainingDurationSeconds?: number;
}

interface CallDetails {
  summary: string;
  transcript: string;
  customerPhone?: string;
  issue?: string;
}

interface ActiveCallsProps {
  onAddAgent?: () => void;
}

type SortField = 'customerPhone' | 'agentId' | 'agentType' | 'duration' | 'isCallback' | 'remainingDuration';
type SortDirection = 'asc' | 'desc' | null;

export function ActiveCalls({ onAddAgent }: ActiveCallsProps) {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [callDetails, setCallDetails] = useState<Map<string, CallDetails>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [signalingAgents, setSignalingAgents] = useState<Set<string>>(new Set());
  const [signaledAgents, setSignaledAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActiveCalls();
    fetchSignaledAgents();
    // Poll every 30 seconds for new/removed calls (not for duration updates)
    const interval = setInterval(() => {
      fetchActiveCalls();
      fetchSignaledAgents();
    }, 30000);

    // Listen for new call assignments to add them immediately (client-side tracking)
    const handleCallAssigned = (event: CustomEvent) => {
      const callData = event.detail;
      const newCall: ActiveCall = {
        id: callData.id,
        customerPhone: callData.customerPhone,
        agentId: callData.agentId,
        agentType: callData.agentType,
        duration: '0m 0s',
        durationSeconds: 0,
        startTime: callData.callStartTime,
        isCallback: callData.isCallback,
        issue: callData.issue,
        expectedDuration: callData.expectedDuration, // Include if available
        remainingDurationSeconds: undefined, // Will be calculated by timer effect
      };

      // Add the call immediately to client-side state
      setActiveCalls((prevCalls) => {
        // Check if call already exists to avoid duplicates
        if (prevCalls.some(c => c.id === newCall.id)) {
          return prevCalls;
        }
        return [...prevCalls, newCall];
      });
    };

    // Listen for callback triggered events to refresh immediately
    const handleCallbackTriggered = () => {
      // Refresh immediately and then again after a short delay to catch any race conditions
      fetchActiveCalls();
      fetchSignaledAgents();
      setTimeout(() => {
        fetchActiveCalls();
        fetchSignaledAgents();
      }, 1500); // Refresh again after 1.5 seconds to ensure backend is fully updated
    };

    // Listen for calls completed events (auto-complete)
    const handleCallsCompleted = () => {
      fetchActiveCalls();
      fetchSignaledAgents();
    };

    window.addEventListener('callAssigned', handleCallAssigned as EventListener);
    window.addEventListener('callbackTriggered', handleCallbackTriggered);
    window.addEventListener('callsCompleted', handleCallsCompleted);

    return () => {
      clearInterval(interval);
      window.removeEventListener('callAssigned', handleCallAssigned as EventListener);
      window.removeEventListener('callbackTriggered', handleCallbackTriggered);
      window.removeEventListener('callsCompleted', handleCallsCompleted);
    };
  }, []);

  const fetchSignaledAgents = async () => {
    try {
      const response = await fetch('/api/agents/signal');
      const data = await response.json();
      if (data.signaledAgents) {
        setSignaledAgents(new Set(data.signaledAgents));
      }
    } catch (error) {
      console.error('Failed to fetch signaled agents:', error);
    }
  };

  // Update call durations and remaining duration every second based on callStartTime from backend
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCalls((prevCalls) => {
        return prevCalls.map((call) => {
          if (call.startTime) {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - call.startTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            
            // Calculate remaining duration on client side using expected end time
            // expectedDuration is in seconds, so we calculate: expectedEndTime = startTime + (expectedDuration * 1000)
            let remainingDurationSeconds: number | undefined;
            if (call.expectedDuration && call.expectedDuration > 0) {
              const startTimeSeconds = Math.floor(call.startTime / 1000);
              const expectedEndTimeSeconds = startTimeSeconds + call.expectedDuration;
              const nowSeconds = Math.floor(now / 1000);
              remainingDurationSeconds = Math.max(0, expectedEndTimeSeconds - nowSeconds);
            }
            
            return {
              ...call,
              duration: `${minutes}m ${seconds}s`,
              durationSeconds: elapsedSeconds,
              remainingDurationSeconds,
            };
          }
          return call;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveCalls = async () => {
    try {
      const response = await fetch('/api/agents/active-calls');
      const data = await response.json();

      const backendCalls: ActiveCall[] = data.activeCalls.map((call: any) => {
        // Store expectedDuration - remaining duration will be calculated on client side
        // in the timer effect that runs every second
        return {
          id: call.id,
          customerPhone: call.customerPhone,
          agentId: call.agentId,
          agentType: call.agentType,
          duration: '0m 0s', // Will be calculated by timer effect
          durationSeconds: 0, // Will be calculated by timer effect
          startTime: call.callStartTime, // Use backend timestamp (in milliseconds)
          isCallback: call.isCallback,
          issue: call.issue,
          expectedDuration: call.expectedDuration, // Expected duration in seconds
          remainingDurationSeconds: undefined, // Will be calculated by timer effect
        };
      });

      // Merge with existing client-side calls to preserve any that were added locally
      setActiveCalls((prevCalls) => {
        const callMap = new Map<string, ActiveCall>();

        // First, add all backend calls
        backendCalls.forEach(call => {
          callMap.set(call.id, call);
        });

        // Then, add any client-side calls that aren't in the backend response
        // (this preserves calls that were just added but backend hasn't synced yet)
        prevCalls.forEach(call => {
          if (!callMap.has(call.id)) {
            callMap.set(call.id, call);
          }
        });

        return Array.from(callMap.values());
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch active calls:', error);
      setLoading(false);
    }
  };

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

  const sortedCalls = useMemo(() => {
    if (!sortField || !sortDirection) {
      return activeCalls;
    }

    return [...activeCalls].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'customerPhone':
          aValue = a.customerPhone;
          bValue = b.customerPhone;
          break;
        case 'agentId':
          aValue = a.agentId;
          bValue = b.agentId;
          break;
        case 'agentType':
          aValue = a.agentType;
          bValue = b.agentType;
          break;
        case 'duration':
          aValue = a.durationSeconds ?? 0;
          bValue = b.durationSeconds ?? 0;
          break;
        case 'isCallback':
          aValue = a.isCallback ? 1 : 0;
          bValue = b.isCallback ? 1 : 0;
          break;
        case 'remainingDuration':
          aValue = a.remainingDurationSeconds ?? -1;
          bValue = b.remainingDurationSeconds ?? -1;
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
  }, [activeCalls, sortField, sortDirection]);

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

  const handleRowClick = async (call: ActiveCall) => {
    if (expandedCallId === call.id) {
      setExpandedCallId(null);
      return;
    }

    setExpandedCallId(call.id);

    // Fetch call details if not already loaded
    if (!callDetails.has(call.id) && !loadingDetails.has(call.id)) {
      setLoadingDetails((prev) => new Set(prev).add(call.id));
      try {
        const response = await fetch(`/api/agents/active-calls/details?callId=${call.id}`);
        const data = await response.json();

        setCallDetails((prev) => {
          const newMap = new Map(prev);
          newMap.set(call.id, {
            summary: data.summary,
            transcript: data.transcript,
            customerPhone: data.customerPhone || call.customerPhone,
            issue: data.issue || call.issue,
          });
          return newMap;
        });
      } catch (error) {
        console.error('Failed to fetch call details:', error);
      } finally {
        setLoadingDetails((prev) => {
          const newSet = new Set(prev);
          newSet.delete(call.id);
          return newSet;
        });
      }
    }
  };

  const handleSignalAgent = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    setSignalingAgents((prev) => new Set(prev).add(agentId));
    try {
      const response = await fetch('/api/agents/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (response.ok) {
        const data = await response.json();
        // Add to signaled agents set to show yellow highlight
        setSignaledAgents((prev) => new Set(prev).add(agentId));
        console.log(`Signal sent to ${agentId}:`, data.message);
        
        // Show toast notification (if available via window event)
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: `Signaling ${agentId} to hang up. Auto-assigning waiting call...`,
            type: 'info',
            duration: 3000
          }
        }));
        
        // Wait for hangup to complete (2 seconds + buffer), then refresh
        setTimeout(() => {
          // Refresh active calls to show updated state
          fetchActiveCalls();
          // Dispatch event to notify parent components
          window.dispatchEvent(new CustomEvent('agentSignaled', { detail: { agentId } }));
          // Show success toast
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              message: `Agent ${agentId} hung up and assigned to new call`,
              type: 'success',
              duration: 4000
            }
          }));
          // Remove from signaled set after refresh
          setSignaledAgents((prev) => {
            const newSet = new Set(prev);
            newSet.delete(agentId);
            return newSet;
          });
        }, 3000); // 3 seconds to allow hangup + auto-assignment
      }
    } catch (error) {
      console.error('Failed to signal agent:', error);
    } finally {
      setTimeout(() => {
        setSignalingAgents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(agentId);
          return newSet;
        });
      }, 2000);
    }
  };


  if (loading) {
    return (
      <Card className="backdrop-blur-lg bg-white/10 border-white/30">
        <CardHeader>
          <CardTitle className="text-white">Active Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/60 text-sm text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Active Calls ({activeCalls.length})
        </CardTitle>
        {onAddAgent && (
          <Button
            onClick={onAddAgent}
            className="bg-white text-black hover:bg-white/90 flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            New Voice Agent
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full">
          <div className="overflow-hidden">
            <Table className="table-fixed w-full [&>div]:overflow-visible">
              <TableHeader>
                <TableRow className="border-white/30 hover:bg-transparent">
                  <TableHead className="text-white/80 font-semibold w-[140px]">
                    <button
                      onClick={() => handleSort('customerPhone')}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      Customer Phone
                      <SortIcon field="customerPhone" />
                    </button>
                  </TableHead>
                  <TableHead className="text-white/80 font-semibold w-[100px]">
                    <button
                      onClick={() => handleSort('isCallback')}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      Type
                      <SortIcon field="isCallback" />
                    </button>
                  </TableHead>
                  <TableHead className="text-white/80 font-semibold w-[120px]">
                    <button
                      onClick={() => handleSort('agentId')}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      Agent ID
                      <SortIcon field="agentId" />
                    </button>
                  </TableHead>
                  <TableHead className="text-white/80 font-semibold w-[120px]">
                    <button
                      onClick={() => handleSort('agentType')}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      Agent Type
                      <SortIcon field="agentType" />
                    </button>
                  </TableHead>
                  <TableHead className="text-white/80 font-semibold w-[100px]">
                    <button
                      onClick={() => handleSort('duration')}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      Duration
                      <SortIcon field="duration" />
                    </button>
                  </TableHead>
                  <TableHead className="text-white/80 font-semibold w-[140px]">
                    <button
                      onClick={() => handleSort('remainingDuration')}
                      className="flex items-center hover:text-white transition-colors"
                    >
                      Est. Remaining
                      <SortIcon field="remainingDuration" />
                    </button>
                  </TableHead>
                  <TableHead className="text-white/80 font-semibold min-w-0">
                    Issue
                  </TableHead>
                  <TableHead className="text-white/80 font-semibold w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                {sortedCalls.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={8} className="text-white/60 text-center py-8">
                      No active calls
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCalls.map((call) => {
                    const callDurationMinutes = call.durationSeconds ? Math.floor(call.durationSeconds / 60) : 0;
                    const isLongCall = callDurationMinutes >= 30;
                    const isRedHighlight = call.agentType === 'HUMAN' && isLongCall;
                    const isExpanded = expandedCallId === call.id;
                    const details = callDetails.get(call.id);
                    const isLoadingDetails = loadingDetails.has(call.id);
                    const isSignaling = signalingAgents.has(call.agentId);
                    const isSignaled = signaledAgents.has(call.agentId);
                    // Show yellow slow flashing highlight when agent is signaled
                    const shouldShowYellowBlink = isSignaled;

                    return (
                      <React.Fragment key={call.id}>
                        <motion.tr
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          onClick={() => handleRowClick(call)}
                          className={cn(
                            "border-white/10 hover:bg-white/15 transition-all duration-300 cursor-pointer",
                            shouldShowYellowBlink
                              ? 'bg-yellow-500/20 border-yellow-500/30'
                              : isRedHighlight
                                ? 'bg-red-500/20 border-red-500/30'
                                : isExpanded
                                  ? 'bg-white/5'
                                  : ''
                          )}
                          style={shouldShowYellowBlink ? {
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)'
                          } : undefined}
                        >
                          <TableCell className="text-white font-mono text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-white/60 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-white/60 shrink-0" />
                              )}
                              <span className="truncate">{call.customerPhone}</span>
                              {shouldShowYellowBlink && (
                                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" style={{
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                }} />
                              )}
                              {isRedHighlight && !shouldShowYellowBlink && (
                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {call.isCallback && (
                                <Badge
                                  variant="outline"
                                  className="border-blue-400/50 text-blue-300 bg-blue-500/20 text-xs"
                                >
                                  Callback
                                </Badge>
                              )}
                              {!call.isCallback && (
                                <span className="text-white/60 text-xs">Regular</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-mono text-sm">
                            <span className="truncate block">{call.agentId}</span>
                          </TableCell>
                          <TableCell>
                            <motion.div
                              key={`${call.agentId}-${call.agentType}`}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                            <Badge
                              variant="outline"
                                className={`text-xs transition-all duration-300 ${call.agentType === 'AI'
                                ? 'border-green-400/50 text-green-300 bg-green-500/20'
                                : 'border-purple-400/50 text-purple-300 bg-purple-500/20'
                                }`}
                            >
                              {call.agentType}
                            </Badge>
                            </motion.div>
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-white/60" />
                              {call.duration}
                            </div>
                          </TableCell>
                          <TableCell className="text-white">
                            {call.remainingDurationSeconds !== undefined && call.remainingDurationSeconds !== null ? (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-white/60" />
                                {(() => {
                                  const remaining = Math.max(0, call.remainingDurationSeconds);
                                  const minutes = Math.floor(remaining / 60);
                                  const seconds = remaining % 60;
                                  if (minutes > 0) {
                                    return `${minutes}m ${seconds}s`;
                                  }
                                  return `${seconds}s`;
                                })()}
                              </div>
                            ) : (
                              <span className="text-white/60">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-white/80 text-sm min-w-0">
                            <span className="truncate block" title={call.issue || '-'}>
                              {call.issue || '-'}
                            </span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {call.agentType === 'HUMAN' && (
                                <Button
                                  onClick={(e) => handleSignalAgent(call.agentId, e)}
                                  disabled={isSignaling}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1 h-auto border-red-500/50 text-red-300 hover:bg-red-500/20"
                                >
                                  <PhoneOff className="w-3 h-3 mr-1" />
                                  {isSignaling ? 'Signaling...' : 'Signal'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                        {isExpanded && (
                          <motion.tr 
                            key={`${call.id}-details`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-white/10"
                          >
                            <TableCell colSpan={7} className="p-0">
                              <div className="p-4 bg-black/20 w-full max-w-full overflow-hidden">
                                {isLoadingDetails ? (
                                  <div className="text-white/60 text-sm text-center py-8">
                                    Loading call details...
                                  </div>
                                ) : details ? (
                                  <div className="w-full max-w-full">
                                    <CallDetailCard
                                      call={{
                                        callId: call.id,
                                        time: new Date(call.startTime || Date.now()).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }),
                                        agentId: call.agentId,
                                        type: 'Ongoing' as const,
                                        issue: details.issue || call.issue || 'Database failover incident',
                                        duration: call.duration,
                                        sentiment: (() => {
                                          // Generate deterministic sentiment based on call ID
                                          const hash = call.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                          return (3 + (hash % 20) / 10).toFixed(1);
                                        })(),
                                        customerPhone: details.customerPhone || call.customerPhone,
                                        summary: details.summary,
                                        transcript: details.transcript,
                                        remainingDurationSeconds: call.remainingDurationSeconds,
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="text-white/60 text-sm text-center py-8">
                                    Failed to load call details
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

