import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, User } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { clearUser } from '@/redux/slices/authSlice';
import { useGetUnreadCountQuery } from '@/redux/api/socialApi';

export default function Navbar() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: countData } = useGetUnreadCountQuery(undefined, { skip: !user });
  const unread = countData?.count ?? 0;

  const handleLogout = async () => {
    await fetch('/api/user/logout', { method: 'POST', credentials: 'include' });
    dispatch(clearUser());
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4">
      <Link to="/" className="text-blue-400 font-bold text-xl mr-4">Aswaq</Link>

      <Link to="/search" className="ml-auto flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
        <Search className="w-5 h-5" />
      </Link>

      <Link to="/notifications" className="relative text-gray-400 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>

      {user && (
        <Link to={`/profile/${user.id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user.name[0]}
            </div>
          )}
        </Link>
      )}

      <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors">
        <LogOut className="w-5 h-5" />
      </button>
    </nav>
  );
}
