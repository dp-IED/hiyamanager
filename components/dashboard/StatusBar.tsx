'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatusBarProps {
  label: string;
  value: string;
  icon?: LucideIcon;
}

export function StatusBar({ label, value, icon: Icon }: StatusBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="backdrop-blur-lg bg-white/10 border border-white/30 rounded-lg px-4 py-3"
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />}
        <span className="font-semibold text-white">{label}:</span>
        <span className="text-white/80">{value}</span>
      </div>
    </motion.div>
  );
}

