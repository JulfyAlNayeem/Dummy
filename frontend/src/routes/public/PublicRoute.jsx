import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import { useGetAllConversationsQuery } from '@/redux/api/conversationApi';
import Loading from '@/pages/Loading';

const PublicRoute = ({ children }) => {
  const { user } = useUserAuth();
  const { data: conversations, isLoading } = useGetAllConversationsQuery(user?._id, { 
    skip: !user?._id 
  });
  
  // Check if user is verified
  const isVerified = localStorage.getItem('isVerified') === 'true';

  // If user is logged in, redirect to their conversations
  if (user) {
    // Show loading while fetching conversations
    if (isLoading) {
      return <Loading />;
    }
    
    // Redirect to first conversation if exists
    const firstConvId = conversations?.[0]?._id;
    if (firstConvId) {
      return <Navigate to={`/e2ee/t/${firstConvId}`} replace />;
    }
    
    // If no conversations, stay on empty chat state
    // Don't redirect to / as that would cause a loop
    return <Navigate to="/e2ee/t/empty" replace />;
  }
  
  // If user is not verified, redirect to home (verification page)
  if (!isVerified) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;