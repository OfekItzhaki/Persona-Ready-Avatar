# API Architecture - Best Practices Implementation

## Overview

This application uses a **secure API proxy pattern** to communicate with the Brain API. This follows Next.js best practices and keeps sensitive configuration server-side.

## Architecture Diagram

```
Browser (Client)
    ↓
    ↓ Calls: /api/agents or /api/chat
    ↓
Next.js API Routes (Server-Side Proxy)
    ↓
    ↓ Calls: http://localhost:3000/api/agents
    ↓
Brain API (External Service)
```

## Components

### 1. Client-Side (Browser)

**File:** `lib/repositories/BrainApiRepository.ts`

The client-side repository makes requests to local Next.js API routes:
- `GET /api/agents` - Fetch available agents
- `POST /api/chat` - Send chat messages

**Configuration:**
```env
NEXT_PUBLIC_BRAIN_API_URL=/api
```

The repository constructs URLs like:
- `/api` + `/agents` = `/api/agents`
- `/api` + `/chat` = `/api/chat`

### 2. Server-Side Proxy (Next.js API Routes)

**Files:**
- `app/api/agents/route.ts` - Proxies agent list requests
- `app/api/chat/route.ts` - Proxies chat requests

These routes:
- ✅ Keep Brain API URL secure (server-side only)
- ✅ Handle CORS automatically
- ✅ Add request validation
- ✅ Implement timeout handling (30s)
- ✅ Provide error transformation
- ✅ Log requests server-side

**Configuration:**
```env
BRAIN_API_URL=http://localhost:3000/api
```

### 3. Brain API (External Service)

The actual AI service running on port 3000:
- `GET http://localhost:3000/api/agents`
- `POST http://localhost:3000/api/chat`

## Security Benefits

### ✅ API URL Hidden from Browser
The actual Brain API URL is never exposed to the browser. Users cannot see or modify it.

### ✅ Server-Side Validation
Requests are validated on the server before being forwarded to the Brain API.

### ✅ CORS Handled Automatically
Next.js API routes handle CORS, avoiding cross-origin issues.

### ✅ Rate Limiting Ready
Easy to add rate limiting to the Next.js API routes.

### ✅ Authentication Ready
Easy to add authentication/authorization middleware.

## Request Flow Example

### Fetching Agents

1. **Client calls:**
   ```typescript
   GET /api/agents
   ```

2. **Next.js API route receives request:**
   ```typescript
   // app/api/agents/route.ts
   export async function GET(request: NextRequest) {
     const brainApiUrl = process.env.BRAIN_API_URL; // http://localhost:3000/api
     const response = await fetch(`${brainApiUrl}/agents`);
     return NextResponse.json(await response.json());
   }
   ```

3. **Proxy forwards to Brain API:**
   ```typescript
   GET http://localhost:3000/api/agents
   ```

4. **Response flows back:**
   ```
   Brain API → Next.js API Route → Client
   ```

### Sending Chat Message

1. **Client calls:**
   ```typescript
   POST /api/chat
   Body: { agentId: "123", message: "Hello" }
   ```

2. **Next.js API route validates and forwards:**
   ```typescript
   // app/api/chat/route.ts
   export async function POST(request: NextRequest) {
     const body = await request.json();
     // Validate
     if (!body.agentId || !body.message) {
       return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
     }
     // Forward
     const response = await fetch(`${brainApiUrl}/chat`, {
       method: 'POST',
       body: JSON.stringify(body)
     });
     return NextResponse.json(await response.json());
   }
   ```

3. **Proxy forwards to Brain API:**
   ```typescript
   POST http://localhost:3000/api/chat
   Body: { agentId: "123", message: "Hello" }
   ```

## Environment Variables

### `.env.local` (Development)

```env
# Server-Side Only: Brain API URL (not exposed to browser)
BRAIN_API_URL=http://localhost:3000/api

# Client-Side: Local API proxy (exposed to browser)
NEXT_PUBLIC_BRAIN_API_URL=/api

# Azure Speech Services (Server-Side Only)
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=westeurope
```

### Production Configuration

```env
# Server-Side Only: Production Brain API
BRAIN_API_URL=https://your-brain-api.com/api

# Client-Side: Still uses local proxy
NEXT_PUBLIC_BRAIN_API_URL=/api
```

## Error Handling

The proxy routes handle various error scenarios:

### Timeout (30 seconds)
```typescript
signal: AbortSignal.timeout(30000)
```

### Brain API Errors
```typescript
if (!response.ok) {
  return NextResponse.json(
    { error: `Brain API returned ${response.status}` },
    { status: response.status }
  );
}
```

### Network Errors
```typescript
catch (error) {
  return NextResponse.json(
    { error: 'Failed to fetch agents' },
    { status: 500 }
  );
}
```

## Testing

The proxy routes can be tested independently:

```bash
# Test agents endpoint
curl http://localhost:3001/api/agents

# Test chat endpoint
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"123","message":"Hello"}'
```

## Advantages Over Direct API Calls

| Aspect | Direct Calls | Proxy Pattern |
|--------|-------------|---------------|
| **Security** | ❌ API URL exposed | ✅ Hidden server-side |
| **CORS** | ❌ Manual handling | ✅ Automatic |
| **Validation** | ❌ Client-side only | ✅ Server-side |
| **Rate Limiting** | ❌ Difficult | ✅ Easy to add |
| **Monitoring** | ❌ Client-side only | ✅ Server-side logs |
| **Authentication** | ❌ Tokens exposed | ✅ Server-side only |

## Future Enhancements

### 1. Add Rate Limiting
```typescript
// app/api/agents/route.ts
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  await rateLimit(request); // Throws if rate limit exceeded
  // ... rest of code
}
```

### 2. Add Authentication
```typescript
// app/api/chat/route.ts
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of code
}
```

### 3. Add Request Logging
```typescript
// app/api/agents/route.ts
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  logger.info('Agent list requested', {
    ip: request.ip,
    userAgent: request.headers.get('user-agent'),
  });
  // ... rest of code
}
```

### 4. Add Caching
```typescript
// app/api/agents/route.ts
export async function GET(request: NextRequest) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
```

## Troubleshooting

### Issue: 404 on /api/agents or /api/chat

**Cause:** API routes not found or not compiled.

**Solution:**
1. Ensure files exist: `app/api/agents/route.ts` and `app/api/chat/route.ts`
2. Restart the dev server: `npm run dev`
3. Clear Next.js cache: `rm -rf .next`

### Issue: ECONNREFUSED when calling Brain API

**Cause:** Brain API is not running on port 3000.

**Solution:**
1. Start the Brain API server
2. Verify it's running: `curl http://localhost:3000/api/agents`
3. Check `BRAIN_API_URL` in `.env.local`

### Issue: Double /api in URL (/api/api/agents)

**Cause:** Endpoint paths include `/api` prefix.

**Solution:**
- Repository endpoints should be: `/agents` and `/chat` (no `/api` prefix)
- Base URL includes `/api`: `NEXT_PUBLIC_BRAIN_API_URL=/api`
- Result: `/api` + `/agents` = `/api/agents` ✅

## Summary

This architecture provides:
- ✅ **Security:** API credentials stay server-side
- ✅ **Simplicity:** Client code doesn't handle CORS
- ✅ **Flexibility:** Easy to add middleware (auth, rate limiting, logging)
- ✅ **Best Practice:** Follows Next.js recommended patterns
- ✅ **Production Ready:** Scales to production environments

The proxy pattern is the recommended approach for Next.js applications communicating with external APIs.
