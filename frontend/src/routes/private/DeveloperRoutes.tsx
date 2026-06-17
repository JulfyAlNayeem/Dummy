import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import Loading from '../../pages/Loading';
import Home from '@/pages/Home';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import GlobalMessageHandler from '@/components/Conversation/GlobalMessageHandler';

const DeveloperRoutes = (): JSX.Element => {

      const { user, loading }: any = useUserAuth();

    if (loading) {
        return <Loading />;
    }

    if (!user) {
        return <Navigate to="/signin" />;
    }
    if (user.role !== 'developer') {
        return <Home />;
    }

    return (
        <>
            <GlobalMessageHandler />
            <Outlet />
        </>
    );
};

export default DeveloperRoutes;