import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from '../MessageList';
import type { ChatMessage } from '@/types';

describe('MessageList - Message Reactions (Requirement 18)', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    {
      id: '2',
      role: 'agent',
      content: 'Hi there!',
      timestamp: new Date('2024-01-01T10:00:01'),
    },
  ];

  it('should display reaction buttons on agent messages when hovering (Requirement 18.1)', () => {
    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={mockMessages}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find the agent message
    const agentMessage = screen.getByText('Hi there!').closest('div[role="article"]');
    expect(agentMessage).toBeTruthy();

    // Hover over the agent message
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage.parentElement!);
    }

    // Check for reaction buttons
    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    const thumbsDownButton = screen.getByLabelText('Thumbs down');

    expect(thumbsUpButton).toBeTruthy();
    expect(thumbsDownButton).toBeTruthy();
  });

  it('should call onReactToMessage when clicking thumbs up (Requirement 18.2)', () => {
    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={mockMessages}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find and hover over the agent message
    const agentMessage = screen.getByText('Hi there!').closest('div[role="article"]');
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage.parentElement!);
    }

    // Click thumbs up
    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    fireEvent.click(thumbsUpButton);

    expect(onReactToMessage).toHaveBeenCalledWith('2', 'thumbs_up');
  });

  it('should call onReactToMessage when clicking thumbs down (Requirement 18.2)', () => {
    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={mockMessages}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find and hover over the agent message
    const agentMessage = screen.getByText('Hi there!').closest('div[role="article"]');
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage.parentElement!);
    }

    // Click thumbs down
    const thumbsDownButton = screen.getByLabelText('Thumbs down');
    fireEvent.click(thumbsDownButton);

    expect(onReactToMessage).toHaveBeenCalledWith('2', 'thumbs_down');
  });

  it('should display selected reaction icon on message (Requirement 18.3)', () => {
    const messagesWithReaction: ChatMessage[] = [
      {
        id: '1',
        role: 'agent',
        content: 'Great answer!',
        timestamp: new Date('2024-01-01T10:00:00'),
        reaction: 'thumbs_up',
      },
    ];

    render(<MessageList messages={messagesWithReaction} />);

    // Check for thumbs up emoji
    expect(screen.getByText('👍')).toBeTruthy();
  });

  it('should allow removing reaction by clicking same button again (Requirement 18.5)', () => {
    const messagesWithReaction: ChatMessage[] = [
      {
        id: '1',
        role: 'agent',
        content: 'Great answer!',
        timestamp: new Date('2024-01-01T10:00:00'),
        reaction: 'thumbs_up',
      },
    ];

    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={messagesWithReaction}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find and hover over the agent message
    const agentMessage = screen.getByText('Great answer!').closest('div[role="article"]');
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage.parentElement!);
    }

    // Click thumbs up again to remove
    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    fireEvent.click(thumbsUpButton);

    // Should be called with null to remove reaction
    expect(onReactToMessage).toHaveBeenCalledWith('1', null);
  });

  it('should support keyboard activation with Enter key (Requirement 18.6)', () => {
    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={mockMessages}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find and hover over the agent message
    const agentMessage = screen.getByText('Hi there!').closest('div[role="article"]');
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage.parentElement!);
    }

    // Press Enter on thumbs up button
    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    fireEvent.keyDown(thumbsUpButton, { key: 'Enter' });

    expect(onReactToMessage).toHaveBeenCalledWith('2', 'thumbs_up');
  });

  it('should support keyboard activation with Space key (Requirement 18.6)', () => {
    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={mockMessages}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find and hover over the agent message
    const agentMessage = screen.getByText('Hi there!').closest('div[role="article"]');
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage.parentElement!);
    }

    // Press Space on thumbs down button
    const thumbsDownButton = screen.getByLabelText('Thumbs down');
    fireEvent.keyDown(thumbsDownButton, { key: ' ' });

    expect(onReactToMessage).toHaveBeenCalledWith('2', 'thumbs_down');
  });

  it('should include ARIA labels on reaction buttons (Requirement 18.7)', () => {
    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={mockMessages}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find and hover over the agent message
    const agentMessage = screen.getByText('Hi there!').closest('div[role="article"]');
    if (agentMessage) {
      fireEvent.mouseEnter(agentMessage.parentElement!);
    }

    // Check ARIA labels
    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    const thumbsDownButton = screen.getByLabelText('Thumbs down');

    expect(thumbsUpButton.getAttribute('aria-label')).toBe('Thumbs up');
    expect(thumbsDownButton.getAttribute('aria-label')).toBe('Thumbs down');
    expect(thumbsUpButton.getAttribute('aria-pressed')).toBe('false');
    expect(thumbsDownButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('should not display reaction buttons on user messages', () => {
    const onReactToMessage = vi.fn();
    render(
      <MessageList
        messages={mockMessages}
        onReactToMessage={onReactToMessage}
      />
    );

    // Find and hover over the user message
    const userMessage = screen.getByText('Hello').closest('div[role="article"]');
    if (userMessage) {
      fireEvent.mouseEnter(userMessage.parentElement!);
    }

    // Reaction buttons should not be present for user messages
    const reactionButtons = screen.queryAllByLabelText(/Thumbs/);
    expect(reactionButtons.length).toBe(0);
  });
});

describe('MessageList - Search and Filter (Requirement 15)', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello world',
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    {
      id: '2',
      role: 'agent',
      content: 'Hi there! How can I help you?',
      timestamp: new Date('2024-01-01T10:00:01'),
    },
    {
      id: '3',
      role: 'user',
      content: 'I need help with testing',
      timestamp: new Date('2024-01-01T10:00:02'),
    },
    {
      id: '4',
      role: 'agent',
      content: 'Sure, I can help with that!',
      timestamp: new Date('2024-01-01T10:00:03'),
    },
  ];

  it('should display search input field above message display (Requirement 15.1)', () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    expect(searchInput).toBeTruthy();
    expect(searchInput.getAttribute('aria-label')).toBe('Search messages');
  });

  it('should filter messages matching search query (Requirement 15.2)', async () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    
    // Type search query
    fireEvent.change(searchInput, { target: { value: 'help' } });

    // Wait for debounce (300ms)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Should show messages containing "help" (using custom matcher for highlighted text)
    const helpTestingElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('I need help with testing') || false;
    });
    expect(helpTestingElements.length).toBeGreaterThan(0);
    
    const helpThatElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('Sure, I can help with that!') || false;
    });
    expect(helpThatElements.length).toBeGreaterThan(0);
    
    // Should not show messages without "help"
    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'Hello world';
    })).toBeNull();
  });

  it('should perform case-insensitive search (Requirement 15.4)', async () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    
    // Type uppercase search query
    fireEvent.change(searchInput, { target: { value: 'HELLO' } });

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Should find "Hello world" despite case difference (using custom matcher for highlighted text)
    const helloWorldElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('Hello world') || false;
    });
    expect(helloWorldElements.length).toBeGreaterThan(0);
  });

  it('should highlight matching text in filtered messages (Requirement 15.3)', async () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    
    // Type search query
    fireEvent.change(searchInput, { target: { value: 'help' } });

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Check for highlighted text (mark elements)
    const highlights = document.querySelectorAll('mark');
    expect(highlights.length).toBeGreaterThan(0);
    
    // Verify highlight has correct styling
    const firstHighlight = highlights[0];
    expect(firstHighlight.className).toContain('bg-yellow-300');
  });

  it('should display count of matching messages (Requirement 15.5)', async () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    
    // Type search query
    fireEvent.change(searchInput, { target: { value: 'help' } });

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Should show count - there are 3 messages with "help" in them
    expect(screen.getByText(/3 messages?/)).toBeTruthy();
  });

  it('should show "no results" message when no matches (Requirement 15.7)', async () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    
    // Type search query with no matches
    fireEvent.change(searchInput, { target: { value: 'xyz123notfound' } });

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Should show no results message
    expect(screen.getByText('No messages match your search.')).toBeTruthy();
  });

  it('should provide clear button (X) to clear search (Requirement 15.8)', () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...') as HTMLInputElement;
    
    // Type search query
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Clear button should appear
    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeTruthy();

    // Click clear button
    fireEvent.click(clearButton);

    // Search input should be cleared
    expect(searchInput.value).toBe('');
  });

  it('should clear search on Escape key (Requirement 15.8)', () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...') as HTMLInputElement;
    
    // Type search query
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput.value).toBe('test');

    // Press Escape
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    // Search input should be cleared
    expect(searchInput.value).toBe('');
  });

  it('should provide role filter dropdown (Requirement 15.6)', () => {
    render(<MessageList messages={mockMessages} />);

    const roleFilter = screen.getByLabelText('Filter messages by role') as HTMLSelectElement;
    expect(roleFilter).toBeTruthy();

    // Check options
    expect(roleFilter.querySelector('option[value="all"]')).toBeTruthy();
    expect(roleFilter.querySelector('option[value="user"]')).toBeTruthy();
    expect(roleFilter.querySelector('option[value="agent"]')).toBeTruthy();
  });

  it('should filter messages by user role (Requirement 15.6)', () => {
    render(<MessageList messages={mockMessages} />);

    const roleFilter = screen.getByLabelText('Filter messages by role') as HTMLSelectElement;
    
    // Select "user only"
    fireEvent.change(roleFilter, { target: { value: 'user' } });

    // Should show only user messages
    expect(screen.getByText('Hello world')).toBeTruthy();
    expect(screen.getByText('I need help with testing')).toBeTruthy();
    
    // Should not show agent messages
    expect(screen.queryByText('Hi there! How can I help you?')).toBeNull();
    expect(screen.queryByText('Sure, I can help with that!')).toBeNull();
  });

  it('should filter messages by agent role (Requirement 15.6)', () => {
    render(<MessageList messages={mockMessages} />);

    const roleFilter = screen.getByLabelText('Filter messages by role') as HTMLSelectElement;
    
    // Select "agent only"
    fireEvent.change(roleFilter, { target: { value: 'agent' } });

    // Should show only agent messages
    expect(screen.getByText('Hi there! How can I help you?')).toBeTruthy();
    expect(screen.getByText('Sure, I can help with that!')).toBeTruthy();
    
    // Should not show user messages
    expect(screen.queryByText('Hello world')).toBeNull();
    expect(screen.queryByText('I need help with testing')).toBeNull();
  });

  it('should combine search and role filters (Requirement 15.6)', async () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    const roleFilter = screen.getByLabelText('Filter messages by role') as HTMLSelectElement;
    
    // Apply role filter
    fireEvent.change(roleFilter, { target: { value: 'agent' } });
    
    // Apply search filter - search for "Sure" which only appears in one agent message
    fireEvent.change(searchInput, { target: { value: 'Sure' } });

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Should show only the one agent message containing "Sure"
    const matchingElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('Sure, I can help with that!') || false;
    });
    expect(matchingElements.length).toBeGreaterThan(0);
    
    // Should not show user messages
    expect(screen.queryByText((content, element) => {
      return element?.textContent?.includes('I need help with testing');
    })).toBeNull();
    
    // Should not show the other agent message
    expect(screen.queryByText((content, element) => {
      return element?.textContent?.includes('Hi there');
    })).toBeNull();
  });

  it('should debounce search input (Requirement 15.2)', async () => {
    render(<MessageList messages={mockMessages} />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 'h' } });
    fireEvent.change(searchInput, { target: { value: 'he' } });
    fireEvent.change(searchInput, { target: { value: 'hel' } });
    fireEvent.change(searchInput, { target: { value: 'help' } });

    // Immediately after typing, all messages should still be visible
    const helloWorldElements = screen.getAllByText((content, element) => {
      return element?.textContent === 'Hello world';
    });
    expect(helloWorldElements.length).toBeGreaterThan(0);
    
    const helpYouElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('Hi there! How can I help you?') || false;
    });
    expect(helpYouElements.length).toBeGreaterThan(0);

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Now filtering should be applied - "Hello world" should be gone
    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'Hello world';
    })).toBeNull();
    
    // Messages with "help" should still be visible
    const helpTestingElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('I need help with testing') || false;
    });
    expect(helpTestingElements.length).toBeGreaterThan(0);
  });
});
