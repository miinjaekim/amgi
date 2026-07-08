'use client';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { getNavItems } from './nav-items';

export default function BottomNav() {
  const pathname = usePathname();
  const { nativeLanguage } = useUser();

  const items = getNavItems(nativeLanguage, pathname);

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-[var(--color-muted)]/40"
      style={{ background: 'var(--color-bg)' }}
    >
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
          style={{ color: item.active ? 'var(--color-highlight)' : 'var(--color-muted)' }}
        >
          {item.icon(item.active)}
          <span className="text-xs font-mono">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
