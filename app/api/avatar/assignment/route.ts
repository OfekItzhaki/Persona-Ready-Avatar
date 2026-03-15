import { NextRequest, NextResponse } from 'next/server';
import { presenterStore } from '@/lib/services/PresenterStore';

/**
 * GET /api/avatar/assignment?agentId=<id>
 *
 * Public endpoint — no admin auth required.
 * Returns the AvatarAssignment for the given agentId.
 *
 * Responses:
 *   200 — AvatarAssignment JSON
 *   400 — agentId param missing or empty
 *   404 — no assignment found for agentId
 *
 * Never exposes ADMIN_SECRET or DID_API_KEY.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const agentId = searchParams.get('agentId');

  if (!agentId || agentId.trim() === '') {
    return NextResponse.json(
      { error: 'Missing required query parameter: agentId' },
      { status: 400 }
    );
  }

  const assignments = presenterStore.getAllAssignments();
  const assignment = assignments[agentId] ?? null;

  if (assignment === null) {
    return NextResponse.json(
      { error: `No avatar assignment found for agentId: ${agentId}` },
      { status: 404 }
    );
  }

  return NextResponse.json(assignment, { status: 200 });
}
