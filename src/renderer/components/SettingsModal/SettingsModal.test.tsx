import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import { SettingsTrigger } from './SettingsTrigger';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore, DEFAULT_SEVERITY_THRESHOLD } from '../../store/useSettingsStore';

describe('SettingsModal + SettingsTrigger', () => {
  beforeEach(() => {
    useAppStore.setState({ settingsOpen: false });
    useSettingsStore.setState({
      mutedEventTypes: [],
      tickerSpeed: 'normal',
      severityThreshold: DEFAULT_SEVERITY_THRESHOLD,
      audioChimeEnabled: false,
      locationOverride: null,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the modal when the trigger icon is clicked', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SettingsTrigger />
        <SettingsModal />
      </>
    );

    expect(useAppStore.getState().settingsOpen).toBe(false);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(useAppStore.getState().settingsOpen).toBe(true);
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
  });

  it('closes via the close button', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsModal />);

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(useAppStore.getState().settingsOpen).toBe(false);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsModal />);

    await user.keyboard('{Escape}');

    expect(useAppStore.getState().settingsOpen).toBe(false);
  });

  it('toggles closed when the trigger icon is clicked again while open', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsTrigger />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(useAppStore.getState().settingsOpen).toBe(false);
  });

  it('mutes an event type when its toggle row is clicked, and un-mutes on a second click', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsModal />);

    const row = screen.getByRole('button', { name: /earthquakes/i });
    await user.click(row);
    expect(useSettingsStore.getState().mutedEventTypes).toContain('earthquake');

    await user.click(row);
    expect(useSettingsStore.getState().mutedEventTypes).not.toContain('earthquake');
  });

  it('sets ticker speed when a speed preset is clicked', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsModal />);

    await user.click(screen.getByRole('button', { name: 'FAST' }));
    expect(useSettingsStore.getState().tickerSpeed).toBe('fast');
  });

  it('updates the severity threshold via the range input', () => {
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsModal />);

    const slider = screen.getByLabelText('Severity threshold');
    fireEvent.change(slider, { target: { value: '5' } });

    expect(useSettingsStore.getState().severityThreshold).toBe(5);
  });

  it('toggles the audio chime opt-in', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsModal />);

    await user.click(screen.getByRole('button', { name: /audio chime/i }));
    expect(useSettingsStore.getState().audioChimeEnabled).toBe(true);
  });

  describe('near you location override (#234)', () => {
    it('rejects an out-of-range latitude with an inline error, without calling the server', async () => {
      const user = userEvent.setup();
      useAppStore.setState({ settingsOpen: true });
      render(<SettingsModal />);

      await user.type(screen.getByLabelText('Latitude'), '999');
      await user.type(screen.getByLabelText('Longitude'), '10');
      await user.click(screen.getByRole('button', { name: 'SAVE' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/latitude/i);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(useSettingsStore.getState().locationOverride).toBeNull();
    });

    it('saves a valid override to the server and reflects it as ACTIVE', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ override: { lat: 40.71, lon: -74.0, name: 'New York, US' } }),
        })
      );
      useAppStore.setState({ settingsOpen: true });
      render(<SettingsModal />);

      await user.type(screen.getByLabelText('Latitude'), '40.71');
      await user.type(screen.getByLabelText('Longitude'), '-74.0');
      await user.type(screen.getByLabelText('Location display name'), 'New York, US');
      await user.click(screen.getByRole('button', { name: 'SAVE' }));

      await waitFor(() =>
        expect(useSettingsStore.getState().locationOverride).toEqual({
          lat: 40.71,
          lon: -74.0,
          name: 'New York, US',
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settings/location'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(screen.getByText(/ACTIVE:/)).toHaveTextContent('New York, US');
    });

    it('disables CLEAR when no override is set, and clears it via the server when one is', async () => {
      const user = userEvent.setup();
      useAppStore.setState({ settingsOpen: true });
      useSettingsStore.setState({ locationOverride: { lat: 1, lon: 2, name: 'Test' } });
      render(<SettingsModal />);

      await user.click(screen.getByRole('button', { name: 'CLEAR' }));

      await waitFor(() => expect(useSettingsStore.getState().locationOverride).toBeNull());
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settings/location'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
