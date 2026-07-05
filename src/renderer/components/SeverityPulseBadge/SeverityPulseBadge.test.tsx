import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityPulseBadge } from './SeverityPulseBadge';

describe('SeverityPulseBadge', () => {
  it('renders the numeric severity and CRIT label', () => {
    render(<SeverityPulseBadge severity={8.6} />);
    expect(screen.getByText('8.6 CRIT')).toBeInTheDocument();
  });

  it('reuses the existing ob-status-critical pulse class', () => {
    render(<SeverityPulseBadge severity={9} />);
    expect(screen.getByText('9.0 CRIT')).toHaveClass('ob-status-critical');
  });
});
