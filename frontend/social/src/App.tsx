import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { fetchCurrentUser } from '@/redux/slices/authSlice';
import Layout from '@/components/layout/Layout';
import FeedPage from '@/pages/FeedPage';
import DiscoverPage from '@/pages/DiscoverPage';
import ProfilePage from '@/pages/ProfilePage';
import PostPage from '@/pages/PostPage';
import PagesListPage from '@/pages/PagesListPage';
import PageViewPage from '@/pages/PageViewPage';
import StoriesPage from '@/pages/StoriesPage';
import BookmarksPage from '@/pages/BookmarksPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SearchPage from '@/pages/SearchPage';
import LoginPage from '@/pages/LoginPage';
import SettingsPage from '@/pages/SettingsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppSelector((s) => s.auth);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<FeedPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="profile/:userId?" element={<ProfilePage />} />
        <Route path="post/:postId" element={<PostPage />} />
        <Route path="pages" element={<PagesListPage />} />
        <Route path="pages/:pageId" element={<PageViewPage />} />
        <Route path="stories" element={<StoriesPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
