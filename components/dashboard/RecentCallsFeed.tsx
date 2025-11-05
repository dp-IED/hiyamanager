'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Star } from 'lucide-react';

interface Call {
  time: string;
  agentId: string;
  type: 'Resolved' | 'Escalated';
  issue: string;
  duration: string;
  sentiment: string;
}

interface RecentCallsFeedProps {
  calls: Call[];
}

export function RecentCallsFeed({ calls }: RecentCallsFeedProps) {
  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/30">
      <CardHeader>
        <CardTitle className="text-white">Recent Calls Live Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 p-4 max-h-96 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {calls.map((call, index) => (
              <motion.div
                key={`${call.time}-${call.agentId}-${index}`}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-3 rounded-lg border ${
                  call.type === 'Resolved'
                    ? 'bg-white/5 border-white/20'
                    : 'bg-white/10 border-white/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/60 text-sm font-mono">{call.time}</span>
                      <span className="text-white font-semibold">{call.agentId}</span>
                      <span className={`text-sm font-medium inline-flex items-center gap-1 ${
                        call.type === 'Resolved' ? 'text-white' : 'text-white/70'
                      }`}>
                        {call.type === 'Resolved' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )} {call.type}
                      </span>
                    </div>
                    <div className="text-white/90 text-sm">{call.issue}</div>
                    <div className="text-white/60 text-xs mt-1 inline-flex items-center gap-1">
                      {call.duration} • Sentiment: <Star className="w-3 h-3 fill-white text-white" strokeWidth={1.5} /> {call.sentiment}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

