import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusSquare, PlayCircle, User } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/profile' }, // Search is on Profile page
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: PlayCircle, label: 'Charts', path: '/charts' }, // Using Charts/Reels slot
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="h-[50px] bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-6 z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-transform active:scale-95 ${
              isActive
                ? 'text-black dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
            }`
          }
        >
          {({ isActive }) => (
            <item.icon
              size={26} // Standard Instagram icon size
              strokeWidth={isActive ? 2.8 : 2} // Bold when active
              fill={
                isActive &&
                item.label !== 'Search' &&
                item.label !== 'Create' &&
                item.label !== 'Charts'
                  ? 'currentColor'
                  : 'none'
              }
            />
          )}
        </NavLink>
      ))}
    </nav>
  );
}
