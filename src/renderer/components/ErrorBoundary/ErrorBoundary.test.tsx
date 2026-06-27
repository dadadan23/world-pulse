import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div>Child content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary name="Test">
        <div>Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary name="Globe">
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Globe unavailable')).toBeDefined();
    expect(screen.getByText('Test render error')).toBeDefined();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary name="Test" fallback={<div>Custom fallback</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeDefined();
  });

  it('shows retry button with remaining count', () => {
    render(
      <ErrorBoundary name="Globe" maxRetries={3}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Retry (3 remaining)')).toBeDefined();
  });

  it('logs error with component name', () => {
    const consoleSpy = vi.spyOn(console, 'error');

    render(
      <ErrorBoundary name="EventPanel">
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ErrorBoundary:EventPanel]'),
      expect.any(String),
      expect.any(String)
    );
  });

  it('retries after clicking retry button and waiting', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });

    const { container } = render(
      <ErrorBoundary name="Globe" retryDelayMs={100} maxRetries={3}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Globe unavailable')).toBeDefined();

    // Click retry manually (fireEvent works better with fake timers)
    const retryBtn = screen.getByText('Retry (3 remaining)');
    await act(async () => {
      retryBtn.click();
      // Advance past the retry delay
      await vi.advanceTimersByTimeAsync(150);
    });

    // After retry, the component re-renders — child throws again,
    // so we see the fallback with decremented count
    expect(container.textContent).toContain('Retry (2 remaining)');

    vi.useRealTimers();
  });
});
