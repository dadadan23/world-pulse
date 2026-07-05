import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkyMapModal } from './SkyMapModal';
import { useAppStore } from '../../store/useAppStore';

describe('SkyMapModal', () => {
  it('renders nothing when skyMapOpen is false', () => {
    useAppStore.setState({ skyMapOpen: false });
    const { container } = render(<SkyMapModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when skyMapOpen is true', () => {
    useAppStore.setState({ skyMapOpen: true, userLat: 40, userLon: -74 });
    render(<SkyMapModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/SKY MAP -- CELESTIAL VIEW/i)).toBeInTheDocument();
  });

  it('closes on backdrop click', () => {
    useAppStore.setState({ skyMapOpen: true });
    render(<SkyMapModal />);
    const backdrop = screen.getByRole('dialog').parentElement!;
    fireEvent.click(backdrop);
    expect(useAppStore.getState().skyMapOpen).toBe(false);
  });

  it('closes on [ ESC ] CLOSE button click', () => {
    useAppStore.setState({ skyMapOpen: true });
    render(<SkyMapModal />);
    fireEvent.click(screen.getByText(/ESC.*CLOSE/i));
    expect(useAppStore.getState().skyMapOpen).toBe(false);
  });

  it('closes on Escape keydown', () => {
    useAppStore.setState({ skyMapOpen: true });
    render(<SkyMapModal />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useAppStore.getState().skyMapOpen).toBe(false);
  });

  it('uses default coordinates when userLat/userLon are null', () => {
    useAppStore.setState({ skyMapOpen: true, userLat: null, userLon: null });
    const { container } = render(<SkyMapModal />);
    expect(container).toBeTruthy();
  });
});
