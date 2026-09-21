'use client';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { getNavItemsForMode } from './nav-items';

export default function BottomNav() {
  const pathname = usePathname();
  const { interfaceLanguage } = useUser();

  const items = getNavItemsForMode(interfaceLanguage, pathname);

  // A mode with no nav rows yet renders no bar at all, rather than an empty
  // one. The switcher lives in the header dropdown on this width, so nothing
  // is unreachable.
  if (items.length === 0) return null;

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
