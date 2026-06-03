import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import Loading from '../../pages/Loading';
import Home from '@/pages/Home';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { useGetClassMembersQuery } from '@/redux/api/classGroup/classApi';
import GlobalMessageHandler from '@/components/Conversation/GlobalMessageHandler';

const StudentRoutes = (): JSX.Element => {
      const { classId } = useParams<{ classId: string }>();
      const { data: membersData, isLoading: membersLoading, error: membersError }: any = useGetClassMembersQuery(classId, { skip: !classId });
      const { user, loading }: any = useUserAuth();

    if (loading) {
        return <Loading />;
    }

    if (!user) {
        return <Navigate to="/signin" />;
    }
    if (user.role !== 'user') {
        return <Home />;
    }

    return (
        <>
            <GlobalMessageHandler />
            <Outlet />
        </>
    );
};

export default StudentRoutes;