import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders default nominal label', () => {
    render(<StatusBadge state="nominal" />);
    expect(screen.getByText('NOMINAL')).toBeTruthy();
  });

  it('renders default warning label', () => {
    render(<StatusBadge state="warning" />);
    expect(screen.getByText('WARN')).toBeTruthy();
  });

  it('renders default critical label', () => {
    render(<StatusBadge state="critical" />);
    expect(screen.getByText('CRIT')).toBeTruthy();
  });

  it('renders default info label', () => {
    render(<StatusBadge state="info" />);
    expect(screen.getByText('INFO')).toBeTruthy();
  });

  it('renders custom children', () => {
    render(<StatusBadge state="nominal">ONLINE</StatusBadge>);
    expect(screen.getByText('ONLINE')).toBeTruthy();
  });

  it('applies ob-status-nominal class for nominal state', () => {
    const { container } = render(<StatusBadge state="nominal" />);
    expect(container.firstChild).toHaveClass('ob-status-nominal');
  });

  it('applies ob-status-warning class for warning state', () => {
    const { container } = render(<StatusBadge state="warning" />);
    expect(container.firstChild).toHaveClass('ob-status-warning');
  });

  it('applies ob-status-critical class for critical state', () => {
    const { container } = render(<StatusBadge state="critical" />);
    expect(container.firstChild).toHaveClass('ob-status-critical');
  });

  it('applies ob-label class for monospace uppercase styling', () => {
    const { container } = render(<StatusBadge state="nominal" />);
    expect(container.firstChild).toHaveClass('ob-label');
  });
});
