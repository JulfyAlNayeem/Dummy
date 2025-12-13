import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import Loading from '../../pages/Loading';
import GlobalMessageHandler from '@/components/Conversation/GlobalMessageHandler';

const ProtectedRoutes = () => {
  const { user, loading } = useUserAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return (
    <>
      {/* Global message handler for messenger-like real-time updates across all conversations */}
      <GlobalMessageHandler />
      <Outlet />
    </>
  );
};

export default ProtectedRoutes;
