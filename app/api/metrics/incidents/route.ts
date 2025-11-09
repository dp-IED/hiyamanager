import { NextResponse } from 'next/server';

/**
 * Retrieves the list of system incidents.
 * 
 * @route GET /api/metrics/incidents
 * @returns {Promise<NextResponse>} Response containing an array of incident objects with id and title
 * @throws {500} If fetching incidents fails
 * 
 * @example
 * // Get incidents
 * GET /api/metrics/incidents
 * 
 * Response: [
 *   {
 *     id: "1",
 *     title: "Database failover incident"
 *   },
 *   {
 *     id: "2",
 *     title: "API service unavailable"
 *   }
 * ]
 */
export async function GET() {
  try {
    const incidents = [
      {
        id: '1',
        title: 'Database failover incident',
      },
      {
        id: '2',
        title: 'API service unavailable',
      },
      {
        id: '3',
        title: 'Connection pool exhaustion',
      },
      {
        id: '4',
        title: 'Read replica lag causing data inconsistency',
      },
    ];

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}

