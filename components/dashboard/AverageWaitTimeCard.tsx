'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface AverageWaitTimeCardProps {
  waitTimeSeconds: number;
  changePercent?: number;
}

export function AverageWaitTimeCard({ waitTimeSeconds, changePercent }: AverageWaitTimeCardProps) {
  const isIncrease = changePercent !== undefined && changePercent > 0;
  const isDecrease = changePercent !== undefined && changePercent < 0;
  const hasChange = changePercent !== undefined && changePercent !== 0;
  const [displaySeconds, setDisplaySeconds] = useState(waitTimeSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplaySeconds((prev) => {
        const diff = waitTimeSeconds - prev;
        if (Math.abs(diff) < 0.1) return waitTimeSeconds;
        return prev + diff * 0.1; // Smooth interpolation
      });
    }, 50);
    return () => clearInterval(timer);
  }, [waitTimeSeconds]);

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="backdrop-blur-lg border-white/30 bg-white/10 hover:bg-white/15 transition-all duration-300">
        <CardContent className="flex items-center gap-4 !p-6">
          <motion.div 
            className="flex items-center shrink-0"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Clock className="w-5 h-5 text-white/80" />
          </motion.div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-white/60 text-sm mb-1">Avg Wait Time</div>
            <div className="flex items-center gap-2">
              <motion.span 
                className="text-white text-2xl font-bold"
                key={waitTimeSeconds}
                initial={{ scale: 1.2, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {formatWaitTime(displaySeconds)}
              </motion.span>
              {hasChange && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    "text-xs font-semibold",
                    isIncrease ? "text-red-400" : "text-green-400"
                  )}
                >
                  {isIncrease ? "↑" : "↓"} {Math.abs(changePercent).toFixed(1)}%
                </motion.span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

