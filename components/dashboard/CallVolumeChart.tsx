'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ChartDataPoint {
  time: string;
  calls: number;
  active: number;
  waiting: number;
  isCurrent?: boolean;
}

interface VolumeData {
  data: ChartDataPoint[];
  current: {
    total: number;
    active: number;
    waiting: number;
  };
}

interface CallVolumeChartProps {
  chartData?: VolumeData;
}

export function CallVolumeChart({ chartData }: CallVolumeChartProps) {
  const [chartDataState, setChartDataState] = useState<ChartDataPoint[]>([]);
  const [currentData, setCurrentData] = useState<{ total: number; active: number; waiting: number } | null>(null);

  useEffect(() => {
    if (chartData) {
      setChartDataState(chartData.data);
      setCurrentData(chartData.current);
    }
  }, [chartData]);

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
            Call Volume
            {currentData && (
              <span className="text-sm font-normal text-white/70 ml-2">
                ({currentData.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {chartDataState.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartDataState}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <defs>
                    {/* Blue gradient for active calls */}
                    <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.6)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" stopOpacity={0.3} />
                    </linearGradient>
                    {/* Red gradient for waiting calls */}
                    <linearGradient id="waitingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(239, 68, 68, 0.6)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="rgba(239, 68, 68, 0.2)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#ffffff80"
                    fontSize={11}
                    tickLine={false}
                    tickCount={6}
                  />
                  <YAxis
                    stroke="#ffffff80"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.max(dataMax || 10, 10)]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    labelFormatter={(label) => `Time: ${label}`}
                    formatter={(value: number, name: string, props: any) => {
                      if (props?.payload) {
                        const { active, waiting } = props.payload;
                        if (name === 'Active') {
                          return [`${value} active`, 'Active'];
                        }
                        if (name === 'Waiting') {
                          return [`${value} waiting`, 'Waiting'];
                        }
                      }
                      return [value, name];
                    }}
                  />
                  {/* Active calls area - Blue */}
                  <Area
                    type="monotone"
                    dataKey="active"
                    stackId="1"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#activeGradient)"
                    connectNulls={true}
                    isAnimationActive={false}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#3b82f6",
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                  />
                  {/* Waiting calls area - Red */}
                  <Area
                    type="monotone"
                    dataKey="waiting"
                    stackId="1"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#waitingGradient)"
                    connectNulls={true}
                    isAnimationActive={false}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#ef4444",
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
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
