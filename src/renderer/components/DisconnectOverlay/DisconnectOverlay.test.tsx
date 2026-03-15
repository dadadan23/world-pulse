import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisconnectOverlay } from './DisconnectOverlay';
import { useAppStore } from '../../store/useAppStore';

describe('DisconnectOverlay', () => {
  beforeEach(() => {
    useAppStore.setState({
      connectionStatus: 'connected',
      hasEverConnected: true,
    });
  });

  it('should render nothing when connected', () => {
    const { container } = render(<DisconnectOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('should show reconnecting banner when disconnected', () => {
    useAppStore.setState({ connectionStatus: 'disconnected' });
    render(<DisconnectOverlay />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('RECONNECTING')).toBeDefined();
  });

  it('should show error message on connection error', () => {
    useAppStore.setState({ connectionStatus: 'error' });
    render(<DisconnectOverlay />);
    expect(screen.getByText('CONNECTION ERROR // RETRYING')).toBeDefined();
  });

  it('should show reconnecting for dormant-reconnecting status', () => {
    useAppStore.setState({ connectionStatus: 'dormant-reconnecting' });
    render(<DisconnectOverlay />);
    expect(screen.getByText('RECONNECTING')).toBeDefined();
  });
});
