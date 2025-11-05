'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  index?: number;
}

export function KPICard({ icon: Icon, value, label, index = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="backdrop-blur-lg bg-white/10 border-white/30 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <Icon className="w-12 h-12 mb-3 text-white" strokeWidth={1.5} />
          <div className="text-4xl font-bold mb-2 text-white">{value}</div>
          <div className="text-sm text-white/70 uppercase tracking-wide">{label}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

