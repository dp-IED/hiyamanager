'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ForecastMetricsProps {
  currentCallsPerHour: number;
  forecastedPeak: number;
  peakTimeMinutes: number;
  recommendedAgents: number;
}

export function ForecastMetrics({
  currentCallsPerHour,
  forecastedPeak,
  peakTimeMinutes,
  recommendedAgents,
}: ForecastMetricsProps) {
  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/30">
      <CardHeader>
        <CardTitle className="text-white text-sm font-medium">Forecast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-sm">Current</span>
          <span className="text-white font-semibold">{currentCallsPerHour}/hr</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-sm">Forecasted Peak</span>
          <Badge variant="outline" className="border-white/30 text-white bg-white/10">
            {forecastedPeak}/hr
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-sm">Peak in</span>
          <span className="text-white font-semibold">{peakTimeMinutes} min</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/20">
          <span className="text-white/70 text-sm">Recommended Agents</span>
          <Badge variant="outline" className="border-white/50 text-white bg-white/20">
            +{recommendedAgents}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

