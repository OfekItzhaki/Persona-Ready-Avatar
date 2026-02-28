import { NextResponse } from 'next/server';

/**
 * GET /api/agents
 * 
 * Proxies requests to the Brain API to fetch available agents.
 * This server-side proxy keeps the Brain API URL secure and handles CORS.
 */
export async function GET() {
  const brainApiUrl = process.env.BRAIN_API_URL;

  if (!brainApiUrl) {
    return NextResponse.json(
      { error: 'Brain API URL not configured' },
      { status: 500 }
    );
  }

  try {
    const controller = new (globalThis as typeof globalThis & { AbortController: typeof AbortController }).AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`${brainApiUrl}/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Brain API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Add default voice and language properties to agents if missing
    // The Brain API returns agents without voice/language, so we add defaults
    if (data.agents && Array.isArray(data.agents)) {
      data.agents = data.agents.map((agent: { voice?: string; language?: string; [key: string]: unknown }) => ({
        ...agent,
        voice: agent.voice || 'en-US-JennyNeural',
        language: agent.language || 'en-US',
      }));
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching agents from Brain API:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
