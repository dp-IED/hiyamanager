'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastAlertProps {
  severity: 'CRITICAL' | 'HIGH' | 'NORMAL';
  incidentType: string;
  peakTimeMinutes: number;
}

export function ForecastAlert({ severity, incidentType, peakTimeMinutes }: ForecastAlertProps) {
  if (severity === 'NORMAL') return null;

  return (
    <Card className={cn(
      "backdrop-blur-lg border-white/30",
      severity === 'CRITICAL'
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-orange-500/10 border-orange-500/30'
    )}>
      <CardContent className="flex items-center gap-4 !p-6">
        <div className="flex items-center shrink-0">
          <AlertTriangle className={cn(
            "w-5 h-5",
            severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'
          )} />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn(
                "border-white/30 text-white",
                severity === 'CRITICAL' ? 'bg-red-500/20' : 'bg-orange-500/20'
              )}
            >
              {severity}
            </Badge>
            <span className="text-white font-semibold">{incidentType}</span>
          </div>
          <div className="text-white/70 text-sm">
            Peak load in {peakTimeMinutes} minutes
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

