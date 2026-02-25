# React Query Hooks

This module provides React Query hooks for server state management in the Avatar Client.

## Available Hooks

### `useAgents()`

Fetches and caches the list of available agents from the Brain API.

**Features:**
- Automatic caching with 5-minute stale time (Requirement 11.2)
- Automatic retry on failure (3 attempts)
- Background refetching disabled for stable agent list
- Error handling with structured logging

**Usage:**

```tsx
import { useAgents } from '@/lib/hooks';

function PersonaSwitcher() {
  const { data: agents, isLoading, error } = useAgents();

  if (isLoading) return <div>Loading agents...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <select>
      {agents?.map(agent => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}
```

### `useSendMessage()`

Sends a chat message to the Brain API with optimistic UI updates and TTS synthesis.

**Features:**
- Optimistic UI updates (Requirement 11.3)
- Automatic TTS synthesis on success (Requirement 5.6)
- Message history management via Zustand store
- Error handling with rollback on failure
- Structured logging for observability

**Usage:**

```tsx
import { useSendMessage } from '@/lib/hooks';
import { useAppStore } from '@/lib/store/useAppStore';

function ChatInterface({ ttsService, selectedAgent }) {
  const [input, setInput] = useState('');
  const { mutate: sendMessage, isPending } = useSendMessage();
  const selectedAgentId = useAppStore(state => state.selectedAgentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgentId) return;

    sendMessage({
      agentId: selectedAgentId,
      message: input,
      ttsService,
      selectedAgent,
    });

    setInput('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isPending}
        placeholder="Type a message..."
      />
      <button type="submit" disabled={isPending || !selectedAgentId}>
        {isPending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

## Configuration

The QueryClient is configured in `app/providers.tsx` with the following default options:

```typescript
{
  queries: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    cacheTime: 10 * 60 * 1000,     // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  },
  mutations: {
    retry: 1,
  },
}
```

## Query Keys

Query keys are exported for cache management:

```typescript
import { queryKeys } from '@/lib/hooks';

// Access query keys
queryKeys.agents        // ['agents']
queryKeys.chat(agentId) // ['chat', agentId]
```

## Direct Repository Access

The BrainApiRepository instance is exported for advanced use cases:

```typescript
import { brainApiRepository } from '@/lib/hooks';

// Direct API calls (not recommended for components)
const result = await brainApiRepository.getAgents();
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 4.1**: Fetch agents from Brain API endpoint `/api/agents`
- **Requirement 5.3**: Send messages to Brain API endpoint `/api/chat`
- **Requirement 11.2**: Cache agent list for 5 minutes
- **Requirement 11.3**: Implement optimistic UI updates for message submission
- **Requirement 5.6**: Trigger TTS synthesis on successful message response
