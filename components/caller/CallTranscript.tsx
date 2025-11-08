'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface CallTranscriptProps {
  transcript: string[];
}

export function CallTranscript({ transcript }: CallTranscriptProps) {
  if (transcript.length === 0) {
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
        <MessageSquare className="w-8 h-8 text-white/40 mx-auto mb-2" />
        <p className="text-white/60 text-sm">Waiting for conversation to begin...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 max-h-64 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-white/70" />
        <span className="text-sm text-white/70 font-semibold">Live Transcript</span>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {transcript.map((line, index) => {
            const isAgent = line.startsWith('Agent:');
            const isCustomer = line.startsWith('Customer:');
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3 rounded-lg ${
                  isAgent
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : isCustomer
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="text-xs text-white/60 mb-1">
                  {isAgent ? 'Agent' : isCustomer ? 'Customer' : 'System'}
                </div>
                <div className="text-sm text-white/90">
                  {line.replace(/^(Agent|Customer):\s*/, '')}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

