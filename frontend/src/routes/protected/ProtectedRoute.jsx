import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import Loading from '../../pages/Loading';

const ProtectedRoutes = () => {
  const { user, loading } = useUserAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
