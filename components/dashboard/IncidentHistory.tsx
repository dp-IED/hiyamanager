'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Incident {
  id: string;
  title: string;
}

interface IncidentHistoryProps {
  incidents: Incident[];
}

export function IncidentHistory({ incidents }: IncidentHistoryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/30">
      <CardHeader>
        <CardTitle className="text-white">Incident History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {incidents.map((incident, index) => (
            <motion.div
              key={incident.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="cursor-pointer"
              onClick={() => setExpanded(expanded === incident.id ? null : incident.id)}
            >
              <div className={`p-3 rounded-lg border border-white/30 hover:bg-white/10 transition-colors ${
                expanded === incident.id ? 'bg-white/10' : ''
              }`}>
                <div className="text-white font-mono text-sm mb-1">{incident.id}</div>
                <div className="text-white/90 text-sm">{incident.title}</div>
                {expanded === incident.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-white/30 text-white/70 text-xs"
                  >
                    Additional details about this incident would appear here. This is a placeholder for the full incident information from incident.io.
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

