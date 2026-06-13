import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CollectorHealthBadge from './CollectorHealthBadge';

describe('CollectorHealthBadge', () => {
  it('renders name and LIVE label when healthy', () => {
    render(<CollectorHealthBadge name="Earthquakes" status="healthy" />);
    expect(screen.getByText('EARTHQUAKES')).toBeDefined();
    expect(screen.getByText('LIVE')).toBeDefined();
  });

  it('renders DEGRADED label when degraded', () => {
    render(<CollectorHealthBadge name="Earthquakes" status="degraded" />);
    expect(screen.getByText('EARTHQUAKES')).toBeDefined();
    expect(screen.getByText('DEGRADED')).toBeDefined();
  });

  it('renders DISABLED label when disabled', () => {
    render(<CollectorHealthBadge name="Volcanoes" status="disabled" />);
    expect(screen.getByText('VOLCANOES')).toBeDefined();
    expect(screen.getByText('DISABLED')).toBeDefined();
  });

  it('shows error count as tooltip when errorCount > 0', () => {
    const { container } = render(
      <CollectorHealthBadge name="ISS" status="degraded" errorCount={3} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.title).toBe('3 errors');
  });

  it('shows singular error count tooltip', () => {
    const { container } = render(
      <CollectorHealthBadge name="Aurora" status="degraded" errorCount={1} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.title).toBe('1 error');
  });

  it('has no tooltip when errorCount is 0', () => {
    const { container } = render(
      <CollectorHealthBadge name="Weather" status="healthy" errorCount={0} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.title).toBe('');
  });

  it('has no tooltip when errorCount is not provided', () => {
    const { container } = render(<CollectorHealthBadge name="News" status="healthy" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.title).toBe('');
  });

  it('uppercases the collector name', () => {
    render(<CollectorHealthBadge name="aurora" status="healthy" />);
    expect(screen.getByText('AURORA')).toBeDefined();
  });

  it('shows STALE label when healthy but stale', () => {
    render(<CollectorHealthBadge name="Weather" status="healthy" isStale={true} />);
    expect(screen.getByText('STALE')).toBeDefined();
  });

  it('shows LIVE label when healthy and not stale', () => {
    render(<CollectorHealthBadge name="Weather" status="healthy" isStale={false} />);
    expect(screen.getByText('LIVE')).toBeDefined();
  });

  it('shows LIVE label when healthy and isStale is not provided', () => {
    render(<CollectorHealthBadge name="Weather" status="healthy" />);
    expect(screen.getByText('LIVE')).toBeDefined();
  });

  it('shows DEGRADED label even when isStale is true (stale only overrides healthy)', () => {
    render(<CollectorHealthBadge name="Weather" status="degraded" isStale={true} />);
    expect(screen.getByText('DEGRADED')).toBeDefined();
  });
});
