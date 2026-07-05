import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    });
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
});
