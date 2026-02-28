# Lazy Loading Implementation for SettingsPanel and PerformanceMonitor

## Overview

This document describes how to implement lazy loading for the SettingsPanel and PerformanceMonitor components to improve initial bundle size and application performance (Requirement 41.5).

## Implementation

### 1. Using React.lazy() and Suspense

Both components should be lazy-loaded using React's built-in `lazy()` function and wrapped with `Suspense` for loading states.

### 2. SettingsPanel Lazy Loading

In the parent component where SettingsPanel is used (e.g., ChatInterface or main layout):

```typescript
import { lazy, Suspense } from 'react';

// Lazy load SettingsPanel
const SettingsPanel = lazy(() => import('@/components/SettingsPanel'));

// In the component:
function ParentComponent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      {/* Settings button */}
      <button onClick={() => setIsSettingsOpen(true)}>
        Settings
      </button>

      {/* Lazy-loaded SettingsPanel with Suspense fallback */}
      {isSettingsOpen && (
        <Suspense fallback={<div className="p-4">Loading settings...</div>}>
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
```

### 3. PerformanceMonitor Lazy Loading

The PerformanceMonitor is conditionally rendered based on visibility preference:

```typescript
import { lazy, Suspense } from 'react';

// Lazy load PerformanceMonitor
const PerformanceMonitor = lazy(() => import('@/components/PerformanceMonitor'));

// In the component:
function ParentComponent() {
  const performanceMonitorVisible = useAppStore(
    (state) => state.uiPreferences.performanceMonitorVisible
  );

  return (
    <>
      {/* Other components */}
      
      {/* Lazy-loaded PerformanceMonitor with Suspense fallback */}
      {performanceMonitorVisible && (
        <Suspense fallback={null}>
          <PerformanceMonitor />
        </Suspense>
      )}
    </>
  );
}
```

## Benefits

1. **Reduced Initial Bundle Size**: Components are only loaded when needed
2. **Faster Initial Load**: Less JavaScript to parse and execute on page load
3. **Better Performance**: Code splitting creates smaller chunks
4. **Improved User Experience**: Faster time to interactive

## Export Changes Required

### SettingsPanel.tsx

Change the export to default export:

```typescript
// At the end of SettingsPanel.tsx
export default SettingsPanel;
```

### PerformanceMonitor.tsx

Change the export to default export:

```typescript
// At the end of PerformanceMonitor.tsx
export default PerformanceMonitor;
```

## Testing Considerations

When testing components that use lazy loading:

1. Use `waitFor` from React Testing Library to wait for lazy components to load
2. Mock the lazy imports if needed for faster test execution
3. Test the loading fallback UI

Example:

```typescript
import { render, screen, waitFor } from '@testing-library/react';

test('loads and displays SettingsPanel', async () => {
  render(<ParentComponent />);
  
  // Click settings button
  fireEvent.click(screen.getByText('Settings'));
  
  // Wait for lazy component to load
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

## Performance Metrics

After implementing lazy loading, you should see:

- Reduced main bundle size by ~50-100KB (depending on component complexity)
- Faster initial page load (measured by Lighthouse)
- Improved Time to Interactive (TTI)
- Better First Contentful Paint (FCP)

## Implementation Status

- [x] MessageList wrapped with React.memo (Requirement 41.2)
- [x] AvatarCustomizer wrapped with React.memo (Requirement 41.2)
- [x] AudioController wrapped with React.memo (Requirement 41.2)
- [x] SettingsPanel slider inputs debounced to 300ms (Requirement 41.3)
- [x] Audio level indicator throttled to 30 FPS (Requirement 41.4)
- [ ] SettingsPanel lazy loading (Requirement 41.5) - **Requires parent component integration**
- [ ] PerformanceMonitor lazy loading (Requirement 41.5) - **Requires parent component integration**

## Next Steps

1. Identify the parent component(s) that render SettingsPanel and PerformanceMonitor
2. Implement lazy loading using the patterns described above
3. Update exports to default exports
4. Update tests to handle lazy loading
5. Verify bundle size reduction using webpack-bundle-analyzer or similar tool
6. Run Lighthouse audit to confirm performance improvements

## References

- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [Code Splitting in Next.js](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [Requirement 41: Performance - Component Optimization](../.kiro/specs/enhanced-avatar-features/requirements.md#requirement-41-performance---component-optimization)
