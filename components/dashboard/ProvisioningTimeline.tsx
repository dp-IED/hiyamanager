'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimelineEvent {
  time: string;
  action: string;
  type: 'provision' | 'deprovision';
}

interface ProvisioningTimelineProps {
  timeline: TimelineEvent[];
}

export function ProvisioningTimeline({ timeline }: ProvisioningTimelineProps) {
  const reversedTimeline = [...timeline].reverse();
  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/30">
      <CardHeader>
        <CardTitle className="text-white">Provisioning Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {reversedTimeline.length === 0 ? (
          <div className="text-white/50 text-center py-8">
            No provisioning events yet
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-white/30">
            <AnimatePresence>
              {reversedTimeline.map((event, index) => (
                <motion.div
                  key={`${event.time}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="relative mb-6 last:mb-0"
                >
                  <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 ${event.type === 'provision'
                    ? 'bg-white border-white'
                    : 'bg-white/50 border-white/50'
                    }`} />
                  <div className="ml-4">
                    <div className="text-white font-mono text-sm mb-1">{event.time}</div>
                    <div className="text-white/80">{event.action}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

