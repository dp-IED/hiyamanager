import { NextResponse } from 'next/server';

// Generate call volume data for the last 3 hours
// Each data point represents a 5-minute interval (36 points total for 3 hours)
function generateChartData() {
  const now = Date.now();
  const threeHoursAgo = now - (3 * 60 * 60 * 1000);
  const intervalMinutes = 5; // 5-minute intervals
  const totalIntervals = (3 * 60) / intervalMinutes; // 36 intervals for 3 hours
  
  const data = [];
  
  for (let i = 0; i < totalIntervals; i++) {
    const timestamp = threeHoursAgo + (i * intervalMinutes * 60 * 1000);
    const date = new Date(timestamp);
    
    // Generate realistic call volume data (slightly randomized)
    const baseCalls = 30 + Math.sin(i / 10) * 10; // Wave pattern
    const calls = Math.floor(baseCalls + Math.random() * 15);
    
    data.push({
      timestamp: timestamp,
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      calls: Math.max(0, calls),
    });
  }
  
  // Add the current point
  data.push({
    timestamp: now,
    time: new Date(now).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    calls: Math.floor(Math.random() * 30) + 20,
  });
  
  return data;
}

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const data = generateChartData();
  return NextResponse.json({ data });
}

