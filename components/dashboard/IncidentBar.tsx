'use client';

import { motion } from 'framer-motion';

interface Incident {
  id: string;
  title: string;
}

interface IncidentBarProps {
  incidents: Incident[];
  forecastIncidents?: Array<{
    time: Date | string;
    description: string;
  }>;
}

export function IncidentBar({ incidents, forecastIncidents = [] }: IncidentBarProps) {
  // Deduplicate forecast incidents by description
  const uniqueForecastIncidents = forecastIncidents.filter(
    (inc, index, self) => 
      index === self.findIndex((i) => i.description === inc.description)
  );

  const allIncidents = [
    ...incidents,
    ...uniqueForecastIncidents.map((inc, idx) => ({
      id: `FORECAST-${idx}`,
      title: inc.description,
    })),
  ];

  return (
    <div className="backdrop-blur-lg bg-white/10 border border-white/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/80 font-semibold text-sm">Incident History:</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {allIncidents.map((incident, index) => (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="text-white/90 text-sm"
          >
            {incident.id.startsWith('FORECAST') ? (
              <span>{incident.title}</span>
            ) : (
              <>
                <span className="font-mono text-white/60 text-xs mr-1">{incident.id}</span>
                <span>{incident.title}</span>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

