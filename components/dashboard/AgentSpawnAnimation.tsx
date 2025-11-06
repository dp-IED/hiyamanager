'use client';

import { motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';

interface AgentSpawnAnimationProps {
  agentId: string;
  onComplete?: () => void;
}

export function AgentSpawnAnimation({ agentId, onComplete }: AgentSpawnAnimationProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 20,
          onComplete
        }}
      >
        {/* Main agent icon */}
        <motion.div
          className="relative w-32 h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full border-2 border-purple-400/50 flex items-center justify-center backdrop-blur-lg"
          animate={{
            boxShadow: [
              '0 0 0px rgba(168, 85, 247, 0.4)',
              '0 0 40px rgba(168, 85, 247, 0.6)',
              '0 0 0px rgba(168, 85, 247, 0.4)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Bot className="w-16 h-16 text-purple-300" />
        </motion.div>

        {/* Particle effects */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 1 }}
            animate={{
              scale: [0, 2, 3],
              opacity: [1, 0.5, 0],
              x: Math.cos((i * Math.PI * 2) / 8) * 100,
              y: Math.sin((i * Math.PI * 2) / 8) * 100,
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.1,
              ease: 'easeOut',
            }}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
          </motion.div>
        ))}

        {/* Agent ID text */}
        <motion.div
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-white font-bold text-lg bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
            {agentId}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

