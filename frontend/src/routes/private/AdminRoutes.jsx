import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Loading from '../../pages/Loading'; 
import { useUser } from '@/redux/slices/authSlice';
import ErrorFallback from '@/pages/ErrorFallback';

const AdminRoutes = () => {
  const { user, loading } = useUser();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/signin" />;

  const allowedRoles = ['admin', 'superadmin', 'moderator'];

  if (!allowedRoles.includes(user.role)) {
    return <ErrorFallback />;
  }

  return <Outlet />;
};

export default AdminRoutes;
