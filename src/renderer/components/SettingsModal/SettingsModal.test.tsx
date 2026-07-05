import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import { SettingsTrigger } from './SettingsTrigger';
import { useAppStore } from '../../store/useAppStore';

describe('SettingsModal + SettingsTrigger', () => {
  beforeEach(() => {
    useAppStore.setState({ settingsOpen: false });
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
});
