'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, ComposedChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ChartDataPoint {
  time: string;
  calls: number;
  upper?: number;
  lower?: number;
  confidenceRange?: number;
}

interface CallVolumeChartProps {
  forecastData?: Array<{
    hour: number;
    predicted_calls: number;
  }>;
}

export function CallVolumeChart({ forecastData }: CallVolumeChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // Generate simple increasing curve
    const generateData = () => {
      const data: ChartDataPoint[] = [];
      const now = new Date();
      const points = 20; // 20 data points for smooth curve
      
      // Start value
      let currentValue = 30;
      const targetValue = forecastData?.[0]?.predicted_calls || 150;
      const growthRate = (targetValue - currentValue) / points;

      for (let i = 0; i < points; i++) {
        const time = new Date(now.getTime() - (points - i) * 9 * 60 * 1000); // 9 min intervals
        
        // Smooth exponential-like growth
        const progress = i / points;
        const value = currentValue + (targetValue - currentValue) * (1 - Math.pow(1 - progress, 2));
        
        data.push({
          time: time.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          calls: Math.round(value),
        });
      }

      // Add confidence range at the end (last 4 points for prediction)
      if (forecastData && forecastData.length > 0) {
        const confidence = 0.2; // 20% confidence range
        const predictionPoints = 4;
        
        // Extend data with prediction points
        const lastActualValue = data[data.length - 1].calls;
        const predictedValue = forecastData[0]?.predicted_calls || lastActualValue * 1.5;
        
        for (let i = 0; i < predictionPoints; i++) {
          const progress = (i + 1) / predictionPoints;
          const time = new Date(now.getTime() + (i + 1) * 9 * 60 * 1000);
          const value = lastActualValue + (predictedValue - lastActualValue) * progress;
          
          const upperValue = Math.round(value * (1 + confidence));
          
          data.push({
            time: time.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            calls: Math.round(value),
            upper: upperValue,
            lower: Math.round(value * (1 - confidence)), // Add lower bound for proper area rendering
          });
        }
      }
      
      // Ensure all data points have upper and lower values for consistent area rendering
      data.forEach((d) => {
        if (!d.upper) {
          d.upper = d.calls;
        }
        if (!d.lower) {
          d.lower = d.calls;
        }
      });

      return data;
    };

    setChartData(generateData());
  }, [forecastData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="backdrop-blur-lg bg-white/10 border-white/30 hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Call Volume Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <XAxis 
                    dataKey="time" 
                    stroke="#ffffff80"
                    fontSize={11}
                    tickLine={false}
                    tickCount={5}
                  />
                  <YAxis 
                    stroke="#ffffff80"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 'dataMax + 20']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    labelFormatter={(label) => `Time: ${label}`}
                    formatter={(value: number, name: string) => {
                      if (name === 'calls') return [`${value} calls`, 'Calls'];
                      return null;
                    }}
                  />
                  {/* Confidence range area - shows prediction uncertainty as shaded area above line */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="url(#confidenceFill)"
                    connectNulls
                  />
                  {/* Main line */}
                  <Line 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="#ffffff" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#ffffff' }}
                    isAnimationActive={false}
                    animationDuration={0}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-white/60">
                Loading chart data...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
