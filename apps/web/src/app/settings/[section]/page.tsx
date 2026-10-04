'use client';
import { useParams } from 'next/navigation';
import { SettingsDetail } from '@/components/SettingsPage';

export default function SettingsSectionRoute() {
  const { section } = useParams<{ section: string }>();
  return <SettingsDetail section={section} />;
}
