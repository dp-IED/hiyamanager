interface CallEntry {
  timestamp: Date;
  calls: number;
  hour: number;
  event?: string;
}

export class TechCallCenterHistory {
  private history: CallEntry[] = [];
  private eventLog: { time: Date; description: string }[] = [];

  constructor(timeWindow: 'short' | 'long' = 'short') {
    this.generateRealisticHistory(timeWindow);
  }

  /**
   * Tech SaaS call center patterns:
   * - Baseline: 300-400 calls/hour (API issues, billing, integrations)
   * - Spike triggers:
   *   - Service outage (2-3x calls)
   *   - Major feature release (1.5x calls)
   *   - Platform maintenance (1.3x calls)
   *   - Billing system glitch (2.5x calls)
   * - Peak hours: 10am-12pm, 3pm-5pm (when developers are awake)
   */
  private generateRealisticHistory(timeWindow: 'short' | 'long') {
    const now = new Date();
    const hoursBack = timeWindow === 'short' ? 12 : 7 * 24;

    this.history = [];

    for (let i = hoursBack; i > 0; i--) {
      const date = new Date(now.getTime() - i * 3600000);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      // Tech SaaS baseline
      let baselineCalls = 350;

      // Dev hours peak (9am-5pm when devs are working)
      if (hour >= 9 && hour <= 17) {
        baselineCalls *= 1.6; // +60% during work hours
      }

      // West Coast wake up (8am Pacific = 11am UTC)
      if (hour >= 11 && hour <= 13) {
        baselineCalls *= 1.8; // +80%
      }

      // Weekend: Devs sleeping, fewer issues
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baselineCalls *= 0.5; // -50% on weekends
      }

      // Night (10pm-8am): Minimal activity
      if (hour >= 22 || hour < 8) {
        baselineCalls *= 0.3; // -70%
      }

      // Random noise ±15%
      const noise = 0.85 + Math.random() * 0.3;
      const calls = Math.round(baselineCalls * noise);

      const entry: CallEntry = {
        timestamp: date,
        calls,
        hour,
      };

      // Inject realistic tech incidents in history
      if (timeWindow === 'long' && i === 48) {
        // 2 days ago: Minor API timeout issue
        entry.calls = Math.round(calls * 1.5);
        entry.event = 'API Timeouts';
        this.eventLog.push({
          time: date,
          description: '⚠️ API Timeout Issues: +50% support calls',
        });
      }

      if (timeWindow === 'long' && i === 24) {
        // 1 day ago: Payment processing glitch
        entry.calls = Math.round(calls * 2.3);
        entry.event = 'Payment Glitch';
        this.eventLog.push({
          time: date,
          description: '💳 Payment Processing Error: +130% support calls',
        });
      }

      this.history.push(entry);
    }
  }

  /**
   * Forecast with TECH INCIDENT anomaly injection
   * Simulates: "Production database failure - massive call spike incoming"
   */
  forecastNext24Hours(): {
    forecast: number[];
    anomaly_severity: 'CRITICAL' | 'HIGH' | 'NORMAL';
    incident_type: string;
    predicted_spike_time: number;
  } {
    const forecast = [];
    const now = new Date();
    const lastSixHoursAvg =
      this.history
        .slice(-6)
        .map((e) => e.calls)
        .reduce((a, b) => a + b, 0) / 6;

    for (let i = 0; i < 24; i++) {
      const futureDate = new Date(now.getTime() + i * 3600000);
      const hour = futureDate.getHours();

      let predicted = lastSixHoursAvg;

      // Dev hours
      if (hour >= 9 && hour <= 17) predicted *= 1.6;
      if (hour >= 11 && hour <= 13) predicted *= 1.8;

      // Night quiet
      if (hour >= 22 || hour < 8) predicted *= 0.3;

      // MAJOR INCIDENT: Database failover at hour 2
      // (In 2 hours, production database goes down)
      if (i === 2) {
        predicted *= 4.5; // 450% spike
        // Only add event if it doesn't already exist (prevent duplicates on repeated calls)
        const eventExists = this.eventLog.some(
          (e) => e.description === '🔴 CRITICAL: Primary database failover initiated - ALL APIs affected'
        );
        if (!eventExists) {
          this.eventLog.push({
            time: futureDate,
            description:
              '🔴 CRITICAL: Primary database failover initiated - ALL APIs affected',
          });
        }
      }

      // Sustained high load while team fixes (hours 2-6)
      if (i > 2 && i <= 6) {
        const decayFactor = 1 + (3.5 * (6 - i)) / 4; // Slow decay
        predicted *= decayFactor;
      }

      // Gradual recovery (hours 6-10)
      if (i > 6 && i <= 10) {
        const recoveryFactor = 1 + (2.0 * (10 - i)) / 4;
        predicted *= recoveryFactor;
      }

      forecast.push(Math.round(predicted));
    }

    const maxForecast = Math.max(...forecast);
    const anomaly_severity =
      maxForecast > lastSixHoursAvg * 3.5
        ? 'CRITICAL'
        : maxForecast > lastSixHoursAvg * 2
          ? 'HIGH'
          : 'NORMAL';

    return {
      forecast,
      anomaly_severity,
      incident_type: 'Database Failover',
      predicted_spike_time: 2,
    };
  }

  /**
   * Get summary for support ops manager
   */
  getSummary() {
    const lastHour = this.history.slice(-1)[0]?.calls || 0;
    const last6Hours =
      this.history
        .slice(-6)
        .map((e) => e.calls)
        .reduce((a, b) => a + b, 0) / 6;

    const forecast = this.forecastNext24Hours();
    const maxForecast = Math.max(...forecast.forecast);

    return {
      current_calls_per_hour: lastHour,
      avg_last_6_hours: Math.round(last6Hours),
      forecasted_peak: Math.round(maxForecast),
      peak_time_minutes: forecast.predicted_spike_time * 60,
      severity: forecast.anomaly_severity,
      incident: forecast.incident_type,
      required_extra_agents: Math.ceil((maxForecast - last6Hours) / 50), // 50 calls per support agent
      event_log: this.eventLog.slice(-5).reverse(),
    };
  }

  getHistoryArray(): number[] {
    return this.history.map((e) => e.calls);
  }

  getRawHistory(): CallEntry[] {
    return [...this.history];
  }
}

export const techCallCenter = new TechCallCenterHistory('short');

