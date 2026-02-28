import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfflineNotification } from '../OfflineNotification';
import * as hooks from '@/lib/hooks';

// Mock the useOnlineStatus hook
vi.mock('@/lib/hooks', () => ({
  useOnlineStatus: vi.fn(),
}));

describe('OfflineNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when online', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(true);
    
    const { container } = render(<OfflineNotification />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render notification banner when offline', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    
    render(<OfflineNotification />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
  });

  it('should display correct message when offline', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    
    render(<OfflineNotification />);
    
    expect(screen.getByText(/Message sending is disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/messages will be queued/i)).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    
    render(<OfflineNotification />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
    expect(alert).toHaveAttribute('aria-label', 'Network connectivity status');
  });

  it('should have offline icon', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    
    render(<OfflineNotification />);
    
    const icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('should apply slide-out animation when going online', async () => {
    const { rerender } = render(<OfflineNotification />);
    
    // Start offline
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    rerender(<OfflineNotification />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('translate-y-0');
    
    // Go online
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(true);
    rerender(<OfflineNotification />);
    
    expect(alert).toHaveClass('-translate-y-full');
  });

  it('should hide notification after transition when going online', async () => {
    const { rerender, container } = render(<OfflineNotification />);
    
    // Start offline
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    rerender(<OfflineNotification />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    // Go online
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(true);
    rerender(<OfflineNotification />);
    
    // Wait for the timeout to hide the notification
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    }, { timeout: 500 });
  });

  it('should have proper styling classes', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    
    render(<OfflineNotification />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
    expect(alert).toHaveClass('bg-yellow-500', 'dark:bg-yellow-600');
    expect(alert).toHaveClass('shadow-lg');
  });

  it('should be positioned at the top of the viewport', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    
    render(<OfflineNotification />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('fixed', 'top-0');
  });

  it('should have high z-index for visibility', () => {
    vi.mocked(hooks.useOnlineStatus).mockReturnValue(false);
    
    render(<OfflineNotification />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('z-50');
  });
});
