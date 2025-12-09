import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Loading from '../../pages/Loading'; 
import Home from '@/pages/Home';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import GlobalMessageHandler from '@/components/Conversation/GlobalMessageHandler';

const TeacherRoutes = ({ children }) => {

  const { user, loading } = useUserAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }
    if (user.role !== 'teacher') {
    return <Home />;
  }

  return (
    <>
      <GlobalMessageHandler />
      <Outlet />
    </>
  );
};

export default TeacherRoutes;