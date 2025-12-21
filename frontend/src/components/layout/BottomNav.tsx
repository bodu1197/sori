import { NavLink } from 'react-router-dom';
import { Home, Search, PlusSquare, PlayCircle, User, LucideIcon } from 'lucide-react';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export default function BottomNav() {
  const navItems: NavItem[] = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: PlayCircle, label: 'Charts', path: '/charts' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="h-[50px] bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 flex justify-around items-center px-6 z-50">
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
              size={26}
              strokeWidth={isActive ? 2.8 : 2}
              fill={
                isActive &&
                item.label !== 'Search' &&
                item.label !== 'Charts' &&
                item.label !== 'Create'
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
