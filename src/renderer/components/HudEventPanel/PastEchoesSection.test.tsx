import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PastEchoesSection } from './PastEchoesSection';
import type { HistoricalContextRecord } from '@shared/types';

function makeRecord(overrides: Partial<HistoricalContextRecord> = {}): HistoricalContextRecord {
  return {
    id: 'rec-1',
    title: '1906 San Francisco Earthquake',
    category: 'disaster',
    location: { lat: 37.77, lon: -122.42, name: 'San Francisco, California' },
    date: '1906-04-18',
    summary: 'A magnitude 7.9 earthquake devastated San Francisco.',
    source: { name: 'USGS', license: 'CC0-1.0' },
    confidence: 0.99,
    isSensitive: false,
    ingestedAt: Date.now(),
    ...overrides,
  };
}

describe('PastEchoesSection (#165)', () => {
  it('renders nothing when records array is empty', () => {
    const { container } = render(<PastEchoesSection records={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the section when records are provided', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    expect(screen.getByTestId('past-echoes-section')).toBeInTheDocument();
  });

  it('shows PAST ECHOES header label', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    expect(screen.getByText('PAST ECHOES')).toBeInTheDocument();
  });

  it('defaults to collapsed state — items are not visible', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows collapsed badge with echo count', () => {
    render(<PastEchoesSection records={[makeRecord(), makeRecord({ id: 'rec-2' })]} />);
    expect(screen.getByText(/2 ECHOES/i)).toBeInTheDocument();
  });

  it('shows singular badge text for one record', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    expect(screen.getByText(/1 ECHO\b/i)).toBeInTheDocument();
  });

  it('expands to show items when the header is clicked', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('1906 San Francisco Earthquake')).toBeInTheDocument();
  });

  it('collapses again on second click', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(screen.getByRole('list')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows item year from date field', () => {
    render(<PastEchoesSection records={[makeRecord({ date: '1906-04-18' })]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('echo-year')).toHaveTextContent('1906');
  });

  it('shows BC years correctly', () => {
    render(<PastEchoesSection records={[makeRecord({ date: '-0480-08-09' })]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('echo-year')).toHaveTextContent('0480 BC');
  });

  it('falls back to era when date is absent', () => {
    render(
      <PastEchoesSection records={[makeRecord({ date: undefined, era: 'Classical Antiquity' })]} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('echo-year')).toHaveTextContent('Classical Antiquity');
  });

  it('shows item category label', () => {
    render(<PastEchoesSection records={[makeRecord({ category: 'conflict' })]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('echo-category')).toHaveTextContent('CONFLICT');
  });

  it('shows item summary', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(
      screen.getByText('A magnitude 7.9 earthquake devastated San Francisco.')
    ).toBeInTheDocument();
  });

  it('labels every item as HISTORICAL CONTEXT, not a live event', () => {
    render(<PastEchoesSection records={[makeRecord(), makeRecord({ id: 'rec-2' })]} />);
    fireEvent.click(screen.getByRole('button'));
    const labels = screen.getAllByText('HISTORICAL CONTEXT');
    expect(labels).toHaveLength(2);
  });

  it('sets aria-expanded correctly on the toggle button', () => {
    render(<PastEchoesSection records={[makeRecord()]} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders all records when expanded', () => {
    const records = [
      makeRecord({ id: 'a', title: 'Record A' }),
      makeRecord({ id: 'b', title: 'Record B' }),
      makeRecord({ id: 'c', title: 'Record C' }),
    ];
    render(<PastEchoesSection records={records} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Record A')).toBeInTheDocument();
    expect(screen.getByText('Record B')).toBeInTheDocument();
    expect(screen.getByText('Record C')).toBeInTheDocument();
  });
});
