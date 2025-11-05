import { NextResponse } from 'next/server';
import { techCallCenter } from '@/lib/callHistory';

export async function GET() {
  try {
    const summary = techCallCenter.getSummary();
    const forecast = techCallCenter.forecastNext24Hours();

    return NextResponse.json({
      model: 'TechIncidentPredictor-RealTime',
      scenario: 'SaaS Support Call Center',

      current_state: {
        calls_per_hour: summary.current_calls_per_hour,
        avg_last_6_hours: summary.avg_last_6_hours,
        agents_online: 15,
      },

      forecast: forecast.forecast.map((v, i) => ({
        hour: i,
        predicted_calls: v,
      })),

      anomaly_detection: {
        detected: forecast.anomaly_severity !== 'NORMAL',
        severity: forecast.anomaly_severity,
        incident_type: forecast.incident_type, // "Database Failover"
        peak_calls: forecast.forecast[forecast.predicted_spike_time],
        peak_time_minutes: forecast.predicted_spike_time * 60,
        spike_factor: (
          forecast.forecast[forecast.predicted_spike_time] / summary.avg_last_6_hours
        ).toFixed(1),
        confidence: 0.89,
      },

      provisioning: {
        required_agents: summary.required_extra_agents,
        ai_agents_to_provision: Math.round(summary.required_extra_agents * 0.6), // 60% AI
        human_agents_needed: Math.round(summary.required_extra_agents * 0.4), // 40% human
        response_time_minutes: 3,
        recommended_action:
          forecast.anomaly_severity === 'CRITICAL'
            ? 'PROVISION_AI_AGENTS + ACTIVATE_ESCALATION_QUEUE + NOTIFY_ENGINEERING'
            : 'PROVISION_AI_AGENTS + MONITOR',
        estimated_peak_time: new Date(
          Date.now() + forecast.predicted_spike_time * 60 * 60 * 1000
        ).toISOString(),
      },

      recent_incidents: summary.event_log,
    });
  } catch (error) {
    console.error('Forecast API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}

