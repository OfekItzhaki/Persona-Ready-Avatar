import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/chat
 *
 * Proxies chat requests to the Brain API.
 * This server-side proxy keeps the Brain API URL secure and handles CORS.
 */
export async function POST(request: NextRequest) {
  const brainApiUrl = process.env.BRAIN_API_URL;

  if (!brainApiUrl) {
    return NextResponse.json({ error: 'Brain API URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Validate request body
    if (!body.agentId || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId and message' },
        { status: 400 }
      );
    }

    // Transform request to Brain API format (agent_id and question)
    const brainApiBody = {
      agent_id: body.agentId,
      question: body.message,
    };

    // eslint-disable-next-line no-undef
    const controller = new (
      globalThis as typeof globalThis & { AbortController: typeof AbortController }
    ).AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${brainApiUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brainApiBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Brain API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform Brain API response to frontend format
    const transformedResponse = {
      message: data.answer || data.message || '',
      agentId: body.agentId,
      timestamp: new Date().toISOString(),
      citations: data.citations || [],
      modelUsed: data.modelUsed || '',
      sessionId: data.sessionId || '',
    };

    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error('Error sending message to Brain API:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }

    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
