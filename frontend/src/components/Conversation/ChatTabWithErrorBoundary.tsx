import React from 'react';
import AuthErrorBoundary from '../ErrorBoundary/AuthErrorBoundary';
import ChatTab from './ChatTab';

/**
 * Wrapper component for ChatTab with error boundary protection
 * This catches errors related to missing authentication or conversation state
 */
const ChatTabWithErrorBoundary = (props: any): JSX.Element => {
  return (
    <AuthErrorBoundary>
      <ChatTab {...props} />
    </AuthErrorBoundary>
  );
};

export default ChatTabWithErrorBoundary;
