import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);

    expect(screen.getByText('Waiting for world events...')).toBeDefined();
    expect(screen.getByText("We're not receiving any live events right now.")).toBeDefined();
  });

  it('renders custom title and description', () => {
    render(<EmptyState title="No data" description="Try again" />);

    expect(screen.getByText('No data')).toBeDefined();
    expect(screen.getByText('Try again')).toBeDefined();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<EmptyState title="No data" description="Try again" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<EmptyState />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses Oblivion panel classes', () => {
    const { container } = render(<EmptyState />);
    const panel = container.querySelector('.ob-panel');
    const panelInner = container.querySelector('.ob-panel-inner');

    expect(panel).toBeDefined();
    expect(panelInner).toBeDefined();
  });
});
