'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Phone,
  Clock,
  Star,
  User,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Call {
  callId: string;
  time: string;
  agentId: string;
  type: 'Resolved' | 'Escalated' | 'Ongoing';
  issue: string;
  duration: string;
  sentiment: string;
  customerPhone?: string;
  summary?: string;
  transcript?: string;
  remainingDurationSeconds?: number;
}

interface CallDetailCardProps {
  call: Call;
}

export function CallDetailCard({ call }: CallDetailCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  
  // Calculate remaining time in minutes
  const remainingMinutes = call.remainingDurationSeconds 
    ? Math.floor(call.remainingDurationSeconds / 60) 
    : null;
  const showLongCallWarning = remainingMinutes !== null && remainingMinutes > 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-full"
    >
      <Card className="backdrop-blur-lg bg-white/10 border-white/30 overflow-hidden w-full max-w-full">
        {/* Header Section */}
        <div className="relative bg-white/5 border-b border-white/30 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${call.type === 'Resolved'
                  ? 'bg-green-500/20 border border-green-500/40'
                  : call.type === 'Ongoing'
                    ? 'bg-blue-500/20 border border-blue-500/40'
                    : 'bg-orange-500/20 border border-orange-500/40'
                  }`}>
                  {call.type === 'Resolved' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : call.type === 'Ongoing' ? (
                    <Phone className="w-5 h-5 text-blue-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white mb-1 truncate" title={call.issue}>{call.issue}</h3>
                  <div className="flex items-center gap-4 text-xs text-white/60 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {call.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {call.agentId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {call.duration}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${call.type === 'Resolved'
              ? 'bg-green-500/30 text-green-300 border border-green-500/50'
              : call.type === 'Ongoing'
                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                : 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
              }`}>
              {call.type}
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/30">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-white/60" />
                <span className="text-xs text-white/60 uppercase tracking-wide">Customer</span>
              </div>
              <p className="text-sm font-mono text-white font-semibold truncate" title={call.customerPhone || 'N/A'}>
                {call.customerPhone || 'N/A'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/30">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 fill-white text-white" strokeWidth={1.5} />
                <span className="text-xs text-white/60 uppercase tracking-wide">Sentiment</span>
              </div>
              <p className="text-sm text-white font-semibold flex items-center gap-1">
                <Star className="w-4 h-4 fill-white text-white" strokeWidth={1.5} />
                {call.sentiment}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-white/60" />
                <span className="text-xs text-white/60 uppercase tracking-wide">Duration</span>
              </div>
              <p className="text-sm text-white font-semibold">{call.duration}</p>
            </div>
          </div>

          {/* Long Call Warning Section */}
          {showLongCallWarning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-orange-500/20 rounded-xl p-5 border border-orange-500/50"
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <h4 className="text-sm font-bold text-orange-300 uppercase tracking-wide">What's Taking So Long?</h4>
              </div>
              <p className="text-sm text-orange-200 leading-relaxed">
                This call has over {remainingMinutes} minutes remaining. Consider checking in with the agent or escalating if the issue requires additional support.
              </p>
            </motion.div>
          )}

          {/* Call Summary Section */}
          {call.summary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/5 rounded-xl p-5 border border-white/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-white/80" />
                <h4 className="text-sm font-bold text-white/80 uppercase tracking-wide">Call Summary</h4>
              </div>
              <p className="text-sm text-white/90 leading-relaxed">{call.summary}</p>
            </motion.div>
          )}

          {/* Transcript Section */}
          {call.transcript && (
            <div className="space-y-3">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
                  <span className="text-sm font-semibold text-white">
                    {showTranscript ? 'Hide' : 'View'} Full Transcript
                  </span>
                </div>
                <ArrowRight
                  className={`w-5 h-5 text-white/60 transition-transform ${showTranscript ? 'rotate-90' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showTranscript && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-black/20 rounded-xl p-5 border border-white/30 max-h-96 overflow-y-auto">
                      <div className="space-y-4">
                        {call.transcript.split('\n').map((line, idx) => {
                          const isAgent = line.startsWith('Agent:');
                          const isCustomer = line.startsWith('Customer:');

                          if (!isAgent && !isCustomer) return null;

                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: isAgent ? -10 : 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
                            >
                              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isAgent
                                ? 'bg-white/10 border border-white/30 text-white'
                                : 'bg-white/5 border border-white/20 text-white/90'
                                }`}>
                                <div className="text-xs font-semibold mb-1 text-white/60">
                                  {isAgent ? 'Agent' : 'Customer'}
                                </div>
                                <div className="text-sm leading-relaxed">
                                  {line.replace(/^(Agent|Customer):\s*/, '')}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  );
}

