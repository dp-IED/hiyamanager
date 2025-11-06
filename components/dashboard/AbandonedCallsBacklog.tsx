'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, AlertCircle, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
interface AbandonedCall {
  id: string;
  customerPhone: string;
  waitTime: number;
  timestamp: Date | string | number | undefined;
  issue?: string;
  status: 'abandoned' | 'queued' | 'assigned';
}


export function AbandonedCallsBacklog() {
  const [abandonedCalls, setAbandonedCalls] = useState<AbandonedCall[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const abandonedRes = await fetch('/api/calls/abandoned');
      const abandonedData = await abandonedRes.json();
      setAbandonedCalls(abandonedData.calls || []);
    } catch (error) {
      console.error('Failed to fetch backlog data:', error);
    }
  };

  const handleTriggerCallback = async (callId: string, assignmentType: 'existing' | 'new') => {
    setLoading(true);
    try {
      const response = await fetch('/api/calls/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callId: callId,
          assignmentType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Callback triggered - it will appear in active calls
        console.log('Callback triggered:', data);
        
        // Show success toast
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: assignmentType === 'new' 
              ? `New AI agent created and assigned to callback`
              : `Callback assigned to existing agent`,
            type: 'success',
            duration: 3000
          }
        }));
        
        await fetchData();
        // Force a page refresh of active calls by dispatching a custom event
        window.dispatchEvent(new CustomEvent('callbackTriggered'));
      } else {
        const errorData = await response.json();
        console.error('Failed to trigger callback:', errorData);
        
        // Show error toast
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: {
            message: `Failed to trigger callback: ${errorData.error || 'Unknown error'}`,
            type: 'error',
            duration: 4000
          }
        }));
      }
    } catch (error) {
      console.error('Failed to trigger callback:', error);
      
      // Show error toast
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: {
          message: 'Failed to trigger callback. Please try again.',
          type: 'error',
          duration: 4000
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimeAgo = (timestamp: Date | string | number | undefined) => {
    if (!timestamp) return 'Unknown time';
    
    let date: Date;
    if (typeof timestamp === 'number') {
      // Handle Unix timestamp (seconds or milliseconds)
      date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    return `${diffMins} minutes ago`;
  };


  return (
    <div className="space-y-4">
      {/* Abandoned Calls */}
      <Card className="backdrop-blur-lg bg-white/10 border-white/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Abandoned Calls ({abandonedCalls.filter(c => c.status === 'abandoned').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {abandonedCalls
                .filter((call) => call.status === 'abandoned')
                .map((call) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-3 rounded-lg bg-white/5 border border-white/20 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-4 h-4 text-white/60" />
                        <span className="text-white font-mono text-sm">{call.customerPhone}</span>
                        <span className="text-xs text-white/60">
                          Waited {formatWaitTime(call.waitTime)}
                        </span>
                      </div>
                      {call.issue && (
                        <div className="text-sm text-white/80">{call.issue}</div>
                      )}
                      <div className="text-xs text-white/60 mt-1">
                        {formatTimeAgo(call.timestamp)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleTriggerCallback(call.id, 'existing')}
                        disabled={loading}
                        variant="outline"
                        className="!bg-blue-500 !text-white !hover:bg-blue-600 !border-blue-500 text-xs px-3 py-1 h-auto"
                        size="sm"
                      >
                        <User className="w-3 h-3 mr-1" />
                        Existing Agent
                      </Button>
                      <Button
                        onClick={() => handleTriggerCallback(call.id, 'new')}
                        disabled={loading}
                        variant="outline"
                        className="!bg-purple-500 !text-white !hover:bg-purple-600 !border-purple-500 text-xs px-3 py-1 h-auto"
                        size="sm"
                      >
                        <Bot className="w-3 h-3 mr-1" />
                        New AI Agent
                      </Button>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
            {abandonedCalls.filter((c) => c.status === 'abandoned').length === 0 && (
              <div className="text-white/60 text-sm text-center py-4">
                No abandoned calls
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

