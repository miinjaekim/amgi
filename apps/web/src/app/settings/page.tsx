import { SettingsList } from '@/components/SettingsPage';

/**
 * Settings, as a route — web had none until 2026-10-04, only a popover.
 *
 * ⚠️ **Mounted twice, here and under `/munli/settings`, on purpose.** The mode
 * is read off the path (`modes.ts`), so a single `/settings` would paint Amgi's
 * navigation and offer Amgi's themes to someone who opened it from Munli.
 * Native solves the same thing with a `?mode=` param; a second mount is the
 * version of that which needs nothing else on web to learn a new rule.
 */
export default function SettingsRoute() {
  return <SettingsList />;
}
