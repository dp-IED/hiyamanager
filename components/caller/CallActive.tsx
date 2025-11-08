'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PhoneOff, MessageSquare } from 'lucide-react';
import { CallTranscript } from './CallTranscript';

interface CallActiveProps {
  agentName: string;
  callDuration: number;
  callId?: string;
  onEndCall: () => void;
}

export function CallActive({ agentName, callDuration, callId, onEndCall }: CallActiveProps) {
  const [transcript, setTranscript] = useState<string[]>([]);

  useEffect(() => {
    if (!callId) return;

    // Fetch transcript updates from API
    const fetchTranscript = async () => {
      try {
        const response = await fetch(`/api/calls/${callId}/transcript`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.visibleTurns && data.visibleTurns.length > 0) {
          // Convert turns to transcript format
          const transcriptLines = data.visibleTurns.map((turn: any) => 
            `${turn.role === 'agent' ? 'Agent' : 'Customer'}: ${turn.content}`
          );
          setTranscript(transcriptLines);
        } else if (data.transcript) {
          // Fallback to plain transcript string
          const lines = data.transcript.split('\n').filter((line: string) => line.trim());
          setTranscript(lines);
        }
      } catch (error) {
        console.error('Failed to fetch transcript:', error);
      }
    };

    // Initial fetch
    fetchTranscript();

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchTranscript, 2000);

    return () => clearInterval(interval);
  }, [callId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 space-y-6"
    >
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4"
        >
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {agentName.charAt(agentName.length - 1)}
            </span>
          </div>
        </motion.div>
        <h2 className="text-2xl font-semibold mb-1">{agentName}</h2>
        <p className="text-white/70 text-sm">AI Support Agent</p>
        <div className="mt-2 text-white/60 text-sm">
          Call duration: {formatDuration(callDuration)}
        </div>
      </div>

      <CallTranscript transcript={transcript} />

      <button
        onClick={onEndCall}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <PhoneOff className="w-5 h-5" />
        End Call
      </button>
    </motion.div>
  );
}

