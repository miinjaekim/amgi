import React from 'react';
import AmgiLogo from './AmgiLogo';

const palette = {
  background: '#173F35',
  text: '#E9E0D2',
  highlight: '#EAA09C',
  bgText: '#418E7B',
};

const navItems = [
  { label: 'Learn', href: '/' },
  { label: 'Review', href: '/review' },
];

interface HeaderProps {
  user: any;
  handleSignIn: () => void;
  handleSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, handleSignIn, handleSignOut }) => {
  return (
    <header
      style={{ background: palette.background }}
      className="w-full flex items-center justify-between px-4 py-2 shadow-md"
    >
      <div className="flex items-center gap-6">
        <AmgiLogo color={palette.highlight} stroke={palette.text} size={36} />
        <nav className="flex items-center gap-6 ml-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-base font-mono hover:underline"
              style={{ color: palette.text }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <img src={user.photoURL || ''} alt="User avatar" className="w-8 h-8 rounded-full" />
            <span className="font-medium" style={{ color: palette.text }}>{user.displayName}</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-mono"
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={handleSignIn}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-mono"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
};

export default Header; 