'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PhoneOff, MessageSquare } from 'lucide-react';
import { CallTranscript } from './CallTranscript';

interface CallActiveProps {
  agentName: string;
  callDuration: number;
  onEndCall: () => void;
}

export function CallActive({ agentName, callDuration, onEndCall }: CallActiveProps) {
  const [transcript, setTranscript] = useState<string[]>([]);

  useEffect(() => {
    // Fetch transcript updates
    const interval = setInterval(async () => {
      try {
        // In real implementation, this would fetch from Vapi webhook
        // For demo, we'll simulate transcript updates
        const mockTranscript = [
          'Agent: Hello! Thank you for calling support. I understand you may be experiencing some service issues. How can I help you today?',
          'Customer: Yes, I\'m having trouble connecting to the database.',
          'Agent: I see. We\'re currently experiencing a database failover incident. Let me help you with a workaround.',
          'Customer: Okay, what should I do?',
          'Agent: You can use our read-only mode for now. The failover should complete within the next 5-10 minutes.',
          'Customer: That works, thank you!',
          'Agent: You\'re welcome! Is there anything else I can help with?',
          'Customer: No, that\'s all. Thanks again!',
        ];

        // Simulate progressive transcript
        if (transcript.length < mockTranscript.length) {
          const nextIndex = transcript.length;
          setTimeout(() => {
            setTranscript((prev) => [...prev, mockTranscript[nextIndex]]);
          }, 3000 * (nextIndex + 1));
        }
      } catch (error) {
        console.error('Failed to fetch transcript:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [transcript.length]);

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

