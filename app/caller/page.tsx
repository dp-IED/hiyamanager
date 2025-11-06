'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Clock, User, MessageSquare } from 'lucide-react';
import { CallQueue } from '@/components/caller/CallQueue';
import { CallActive } from '@/components/caller/CallActive';

type CallState = 'idle' | 'calling' | 'queued' | 'connecting' | 'active' | 'ended';

export default function CallerPage() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [waitTime, setWaitTime] = useState(0);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    // Check demo state on mount
    checkDemoState();
    
    // Poll for demo state updates
    const interval = setInterval(checkDemoState, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkDemoState = async () => {
    try {
      const response = await fetch('/api/demo/state');
      const data = await response.json();
      
      if (data.isActive) {
        // Demo is active, update call state
        if (data.callState) {
          setCallState(data.callState);
          setQueuePosition(data.queuePosition);
          setWaitTime(data.waitTime || 0);
          setAgentName(data.agentName);
        }
      }
    } catch (error) {
      console.error('Failed to check demo state:', error);
    }
  };

  const handleStartCall = async () => {
    setCallState('calling');
    
    // Simulate calling
    setTimeout(() => {
      setCallState('queued');
      setQueuePosition(5);
      setWaitTime(0);
    }, 2000);
  };

  const handleEndCall = async () => {
    setCallState('ended');
    // Reset after 3 seconds
    setTimeout(() => {
      setCallState('idle');
      setQueuePosition(null);
      setWaitTime(0);
      setAgentName(null);
      setCallDuration(0);
    }, 3000);
  };

  // Update wait time when in queue
  useEffect(() => {
    if (callState === 'queued') {
      const interval = setInterval(() => {
        setWaitTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  // Update call duration when active
  useEffect(() => {
    if (callState === 'active') {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Customer Support</h1>
          <p className="text-white/70">Hiya AI Phone Demo</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {callState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
            >
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                  <Phone className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Ready to Call</h2>
                  <p className="text-white/70">
                    Click below to connect with our support team
                  </p>
                </div>
                <button
                  onClick={handleStartCall}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Call Support
                </button>
              </div>
            </motion.div>
          )}

          {callState === 'calling' && (
            <motion.div
              key="calling"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
            >
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center"
                >
                  <Phone className="w-12 h-12 text-blue-400" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Calling...</h2>
                  <p className="text-white/70">Connecting to support</p>
                </div>
              </div>
            </motion.div>
          )}

          {callState === 'queued' && (
            <CallQueue
              queuePosition={queuePosition}
              waitTime={waitTime}
              onStateChange={setCallState}
            />
          )}

          {callState === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
            >
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center"
                >
                  <User className="w-12 h-12 text-green-400" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Connecting...</h2>
                  <p className="text-white/70">Agent is joining the call</p>
                </div>
              </div>
            </motion.div>
          )}

          {callState === 'active' && (
            <CallActive
              agentName={agentName || 'AI Agent'}
              callDuration={callDuration}
              onEndCall={handleEndCall}
            />
          )}

          {callState === 'ended' && (
            <motion.div
              key="ended"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
            >
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <PhoneOff className="w-12 h-12 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Call Ended</h2>
                  <p className="text-white/70">
                    Thank you for contacting support. We hope we were able to help!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

