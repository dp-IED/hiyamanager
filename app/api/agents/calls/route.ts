import { NextResponse } from 'next/server';

// Generate recent calls for live feed
function generateRecentCalls() {
  const types = ['Resolved', 'Escalated'];
  const issues = [
    'Password reset request',
    'Billing dispute',
    'Account activation',
    'Feature inquiry',
    'Technical support',
    'Product question',
    'Refund request',
    'Subscription change',
  ];

  const calls = [];
  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const issue = issues[Math.floor(Math.random() * issues.length)];
    const agentId = `AI-${String(Math.floor(Math.random() * 12) + 1).padStart(3, '0')}`;

    calls.push({
      time: new Date(Date.now() - (i + 1) * 60000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      agentId,
      type,
      issue,
      duration: `${Math.floor(Math.random() * 15) + 2}m`,
      sentiment: (Math.random() * 2 + 3).toFixed(1),
    });
  }

  return calls;
}

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 200));
  const calls = generateRecentCalls();
  return NextResponse.json({ calls });
}

