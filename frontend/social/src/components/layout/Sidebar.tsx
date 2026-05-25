import { NavLink } from 'react-router-dom';
import { Home, Compass, Bookmark, Bell, Search, FileText, BookOpen, Settings, Users } from 'lucide-react';
import { useAppSelector } from '@/redux/hooks';

const links = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/discover', label: 'Discover', Icon: Compass },
  { to: '/stories', label: 'Stories', Icon: BookOpen },
  { to: '/pages', label: 'Pages', Icon: FileText },
  { to: '/bookmarks', label: 'Saved', Icon: Bookmark },
  { to: '/notifications', label: 'Notifications', Icon: Bell },
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

export default function Sidebar() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-14 bottom-0 w-64 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto">
      {user && (
        <NavLink
          to={`/profile/${user.id}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 mb-4 transition-colors"
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {user.name[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">{user.name}</p>
            <p className="text-xs text-gray-400">View profile</p>
          </div>
        </NavLink>
      )}

      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
