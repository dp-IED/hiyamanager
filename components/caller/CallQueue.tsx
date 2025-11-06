'use client';

import { motion } from 'framer-motion';
import { Clock, Users } from 'lucide-react';

interface CallQueueProps {
  queuePosition: number | null;
  waitTime: number;
  onStateChange: (state: 'queued' | 'connecting' | 'active') => void;
}

export function CallQueue({ queuePosition, waitTime, onStateChange }: CallQueueProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Simulate queue position improving and connection
  // In real demo, this would be controlled by the demo state API
  if (queuePosition !== null && queuePosition <= 1 && waitTime > 5) {
    setTimeout(() => {
      onStateChange('connecting');
      setTimeout(() => {
        onStateChange('active');
      }, 2000);
    }, 1000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
    >
      <div className="text-center space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-24 h-24 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center"
        >
          <Clock className="w-12 h-12 text-yellow-400" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">Please Hold</h2>
          <p className="text-white/70 mb-4">
            You're in the queue. An agent will be with you shortly.
          </p>
        </div>

        <div className="space-y-4">
          {queuePosition !== null && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-white/70" />
                <span className="text-white/70">Position in queue:</span>
              </div>
              <div className="text-3xl font-bold text-white">{queuePosition}</div>
            </div>
          )}

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-white/70" />
              <span className="text-white/70">Wait time:</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatTime(waitTime)}</div>
          </div>
        </div>

        <div className="text-sm text-white/60">
          {queuePosition !== null && queuePosition > 1
            ? `Approximately ${Math.ceil(queuePosition * 2)} minutes remaining`
            : 'Connecting to agent...'}
        </div>
      </div>
    </motion.div>
  );
}

