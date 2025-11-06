'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CrisisModeDemoProps {
  onStart: () => Promise<void>;
  isRunning?: boolean;
}

export function CrisisModeDemo({ onStart, isRunning = false }: CrisisModeDemoProps) {
  const [step, setStep] = useState<string | null>(null);

  const handleStart = async () => {
    setStep('Crisis detected: Queue building up...');
    await new Promise(resolve => setTimeout(resolve, 500));

    setStep('Auto-provisioning AI agents...');
    await onStart();
    await new Promise(resolve => setTimeout(resolve, 2000));

    setStep('Assigning calls automatically...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    setStep('Queue clearing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    setStep('Crisis resolved!');
    await new Promise(resolve => setTimeout(resolve, 2000));

    setStep(null);
  };

  return (
    <div className="relative">
      <motion.div
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={handleStart}
          disabled={isRunning}
          className={cn(
            "w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-6 text-lg shadow-lg transition-all duration-300",
            isRunning && "opacity-75 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            {isRunning || step ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="w-6 h-6" />
                </motion.div>
                <span>Handling Crisis...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6" />
                <span>Crisis Mode</span>
              </>
            )}
          </div>
        </Button>
      </motion.div>

      <AnimatePresence>
        {step && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-full left-0 right-0 mt-2 p-4 bg-black/90 border border-white/30 rounded-lg backdrop-blur-lg z-10"
          >
            <div className="flex items-center gap-2 text-white">
              {step.includes('resolved') ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="w-5 h-5 text-yellow-400" />
                </motion.div>
              )}
              <span className="text-sm font-medium">{step}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

