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
import { Phone, Clock, ArrowUpDown, ArrowUp, ArrowDown, Bot, AlertTriangle, ChevronDown, ChevronUp, PhoneOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CallDetailCard } from './CallDetailCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Call, Agent } from '@/lib/db/types';

// Extend Call type with UI-specific computed fields
type ActiveCall = Call & {
  agent: Agent | null;
  agentType: 'HUMAN' | 'AI';
  duration: string;
  durationSeconds?: number;
  remainingDurationSeconds?: number;
  isCallback: boolean;
};

interface CallDetails {
  summary: string;
  transcript: string;
  customerPhone?: string;
  issue?: string;
}

interface ActiveCallsProps {
  onAddAgent?: () => void;
  onCrisisMode?: () => Promise<void>;
  crisisModeRunning?: boolean;
}

type SortField = 'customerPhone' | 'agentId' | 'agentType' | 'duration' | 'isCallback' | 'remainingDuration';
type SortDirection = 'asc' | 'desc' | null;

export function ActiveCalls({ onAddAgent, onCrisisMode, crisisModeRunning }: ActiveCallsProps) {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [callDetails, setCallDetails] = useState<Map<string, CallDetails>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [signalingAgents, setSignalingAgents] = useState<Set<string>>(new Set());
  const [signaledAgents, setSignaledAgents] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [processingExpired, setProcessingExpired] = useState(false);

  // Fetch active calls on mount
  useEffect(() => {
    fetchActiveCalls();
  }, []);

  // Update current time every second for real-time timer updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set up timeouts for each call based on remaining duration
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    activeCalls.forEach((call) => {
      if (call.startTime && call.expectedDuration && call.remainingDurationSeconds !== undefined && call.remainingDurationSeconds !== null) {
        const remainingSeconds = call.remainingDurationSeconds;

        if (remainingSeconds <= 0) {
          setActiveCalls(prevCalls => prevCalls.filter(c => c.id !== call.id));
          fetch('/api/calls/check-expired', { method: 'POST' }).catch(err => {
            console.error('Failed to check expired calls:', err);
          });
        } else if (remainingSeconds < 3600) {
          // Set timeout if remaining time is positive and less than 1 hour
          const timeout = setTimeout(() => {
            setActiveCalls(prevCalls => prevCalls.filter(c => c.id !== call.id));
            fetch('/api/calls/check-expired', { method: 'POST' }).catch(err => {
              console.error('Failed to check expired calls:', err);
            });
          }, remainingSeconds * 1000);

          timeouts.push(timeout);
        }
      }
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [activeCalls]);

  const fetchActiveCalls = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agents/active');
      const data: Array<Call & { agent: Agent | null }> = await response.json();
      // calculate duration and remaining duration for each call using current time
      const now = Math.floor(Date.now() / 1000);
      const payload: ActiveCall[] = data.map((call) => {
        const durationSeconds = calculateDuration(call, now);
        const remainingDurationSeconds = calculateRemainingDuration(call, now);
        return {
          ...call,
          agentType: (call.agent?.type || 'AI') as 'HUMAN' | 'AI',
          duration: durationSeconds !== undefined
            ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`
            : '-',
          durationSeconds,
          remainingDurationSeconds,
          isCallback: call.callType === 'callback',
        };
      });
      setActiveCalls(payload);
    } catch (error) {
      console.error('Failed to fetch active calls:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate durations when currentTime updates (for real-time timer updates)
  // Also check for expired calls and close them automatically
  useEffect(() => {
    if (activeCalls.length > 0) {
      const expiredCallIds: string[] = [];

      const updatedCalls = activeCalls.map(call => {
        if (!call.startTime) return call;

        const durationSeconds = calculateDuration(call, currentTime);
        const remainingDurationSeconds = calculateRemainingDuration(call, currentTime);

        // If remaining duration is negative, mark for expiration
        if (remainingDurationSeconds !== undefined && remainingDurationSeconds < 0 && call.id) {
          expiredCallIds.push(call.id);
        }

        return {
          ...call,
          duration: durationSeconds !== undefined
            ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`
            : '-',
          durationSeconds,
          remainingDurationSeconds,
        };
      });

      const filteredCalls = updatedCalls.filter(call => {
        if (call.startTime && call.remainingDurationSeconds !== undefined && call.remainingDurationSeconds !== null) {
          return call.remainingDurationSeconds > 0;
        }
        return true;
      });

      setActiveCalls(filteredCalls);

      if (expiredCallIds.length > 0 && !processingExpired) {
        setProcessingExpired(true);
        fetch('/api/calls/check-expired', { method: 'POST' }).catch(err => {
          console.error('Failed to check expired calls:', err);
        }).finally(() => {
          setProcessingExpired(false);
        });
      }
    }
  }, [currentTime]);

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
    // Don't filter out calls based on remaining time - keep all active calls visible
    const filteredCalls = activeCalls;

    if (!sortField || !sortDirection) {
      return filteredCalls;
    }

    return [...filteredCalls].sort((a, b) => {
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

    // Random delay between 10-30 seconds (in milliseconds)
    const delaySeconds = 10 + Math.floor(Math.random() * 21);
    const delayMs = delaySeconds * 1000;

    try {
      // Mark agent as signaled on server
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

        // Show toast notification with the hangup delay
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: `Signaling ${agentId} to hang up in ${delaySeconds} seconds...`,
            type: 'info',
            duration: delayMs
          }
        }));

        // CLIENT-SIDE DELAY: Wait the random delay, then call hangup endpoint
        setTimeout(async () => {
          try {
            console.log(`[Client] Calling hangup for agent ${agentId} after ${delaySeconds}s delay`);

            // Call the hangup endpoint
            const hangupResponse = await fetch('/api/agents/hangup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agentId }),
            });

            if (hangupResponse.ok) {
              console.log(`[Client] Successfully hung up agent ${agentId}`);

              // Remove from signaled set IMMEDIATELY to stop flashing
              setSignaledAgents((prev) => {
                const newSet = new Set(prev);
                newSet.delete(agentId);
                return newSet;
              });

              // Small delay to ensure database updates are committed before refresh
              await new Promise(resolve => setTimeout(resolve, 300));

              // Refresh active calls to show updated state
              fetchActiveCalls();

              // Dispatch events to notify other components
              window.dispatchEvent(new CustomEvent('agentSignaled', { detail: { agentId } }));
              window.dispatchEvent(new CustomEvent('queueUpdated'));
              window.dispatchEvent(new CustomEvent('callsAssigned', { detail: { count: 1 } }));

              // Show success toast
              window.dispatchEvent(new CustomEvent('showToast', {
                detail: {
                  message: `Agent ${agentId} hung up and available for new calls`,
                  type: 'success',
                  duration: 4000
                }
              }));
            } else {
              console.error(`[Client] Failed to hangup agent ${agentId}`);
              window.dispatchEvent(new CustomEvent('showToast', {
                detail: {
                  message: `Failed to hangup agent ${agentId}`,
                  type: 'error',
                  duration: 4000
                }
              }));
            }
          } catch (hangupError) {
            console.error(`[Client] Error calling hangup for agent ${agentId}:`, hangupError);
          } finally {
            // Remove from signaling set
            setSignalingAgents((prev) => {
              const newSet = new Set(prev);
              newSet.delete(agentId);
              return newSet;
            });
          }
        }, delayMs);
      }
    } catch (error) {
      console.error('Failed to signal agent:', error);
      // Remove from signaling set if signal fails
      setSignalingAgents((prev) => {
        const newSet = new Set(prev);
        newSet.delete(agentId);
        return newSet;
      });
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
        {onCrisisMode && (
          <Button
            onClick={onCrisisMode}
            disabled={crisisModeRunning}
            className={cn(
              "bg-linear-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold flex items-center gap-2",
              crisisModeRunning && "opacity-75 cursor-not-allowed"
            )}
          >
            {crisisModeRunning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="w-4 h-4" />
                </motion.div>
                <span>Handling Crisis...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Crisis Mode</span>
              </>
            )}
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
                      const isSignaling = call.agentId ? signalingAgents.has(call.agentId) : false;
                      const isSignaled = call.agentId ? signaledAgents.has(call.agentId) : false;

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
                              isSignaled
                                ? 'bg-yellow-500/20 border-yellow-500/30'
                                : isRedHighlight
                                  ? 'bg-red-500/20 border-red-500/30'
                                  : isExpanded
                                    ? 'bg-white/5'
                                    : ''
                            )}
                            style={isSignaled ? {
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
                                {isSignaled && (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" style={{
                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                  }} />
                                )}
                                {isRedHighlight && !isSignaled && (
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
                              {(() => {
                                // Calculate remaining duration on the fly for display
                                const remaining = call.startTime && call.expectedDuration
                                  ? calculateRemainingDuration(call, currentTime)
                                  : call.remainingDurationSeconds;

                                if (remaining === undefined || remaining === null) {
                                  return (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4 text-white/60" />
                                      <span className="text-yellow-300 italic">Analysing</span>
                                    </div>
                                  );
                                }

                                if (remaining < 0) {
                                  return (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4 text-white/60" />
                                      <span className="text-yellow-300 italic">Closing...</span>
                                    </div>
                                  );
                                }

                                const minutes = Math.floor(remaining / 60);
                                const seconds = remaining % 60;
                                return (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-white/60" />
                                    {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-white/80 text-sm min-w-0">
                              <span className="truncate block" title={call.issue || '-'}>
                                {call.issue || '-'}
                              </span>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {call.agentType === 'HUMAN' && call.agentId && (
                                  <Button
                                    onClick={(e) => handleSignalAgent(call.agentId!, e)}
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
                                          agentId: call.agentId || '',
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

function calculateDuration(call: Call, currentTime?: number): number | undefined {
  if (!call.startTime) return undefined;
  const now = currentTime || Math.floor(Date.now() / 1000);
  return now - call.startTime;
}

function calculateRemainingDuration(call: Call, currentTime?: number): number | undefined {
  if (!call.startTime) return undefined;
  if (!call.expectedDuration) return undefined;
  const now = currentTime || Math.floor(Date.now() / 1000);
  const elapsedSeconds = now - call.startTime;
  return call.expectedDuration - elapsedSeconds; // Can be negative, which triggers expired check
}

