'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from './AnimatedCounter';
import { motion } from 'framer-motion';

interface WaitingCallsCardProps {
  count: number;
  changePercent?: number;
}

export function WaitingCallsCard({ count, changePercent }: WaitingCallsCardProps) {
  const isIncrease = changePercent !== undefined && changePercent > 0;
  const isDecrease = changePercent !== undefined && changePercent < 0;
  const hasChange = changePercent !== undefined && changePercent !== 0;

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
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Phone className="w-5 h-5 text-white/80" />
          </motion.div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-white/60 text-sm mb-1">Waiting Calls</div>
            <div className="flex items-center gap-2">
              <AnimatedCounter
                value={count}
                className="text-white text-2xl font-bold"
                duration={0.5}
              />
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

