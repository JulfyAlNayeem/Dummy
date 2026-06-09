import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Error Boundary Component for Authentication Errors
 * Redirects to home page when unauthorized or token expired
 */
class AuthErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any): void {
    // Check if it's an authentication-related error
    const isAuthError = 
      error?.message?.includes('index is not defined') ||
      error?.message?.includes('token') ||
      error?.message?.includes('unauthorized') ||
      error?.message?.includes('authentication') ||
      error?.response?.status === 401 ||
      error?.response?.status === 403;

    this.setState({ 
      hasError: true, 
      error,
      errorInfo,
      isAuthError 
    });

    // Log error to console in development
    if (import.meta.env.MODE === 'development') {
      console.error('Error caught by AuthErrorBoundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackComponent 
          error={this.state.error}
          isAuthError={this.state.isAuthError}
          resetError={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Fallback component shown when error occurs
 */
function ErrorFallbackComponent({ error, isAuthError, resetError }: any): JSX.Element {
  const navigate = useNavigate();

  useEffect(() => {
    // If it's an auth error or token-related issue, redirect to home after a short delay
    if (isAuthError) {
      const timer = setTimeout(() => {
        // Clear any invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/', { replace: true });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAuthError, navigate]);

  if (isAuthError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-md">
          <div className="mb-4">
            <svg 
              className="w-16 h-16 mx-auto text-yellow-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Session Expired
          </h2>
          <p className="text-gray-300 mb-4">
            Your session has expired or you're not authorized to access this page.
          </p>
          <p className="text-gray-400 text-sm">
            Redirecting to home page...
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // For non-auth errors, show generic error page
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-md">
        <div className="mb-4">
          <svg 
            className="w-16 h-16 mx-auto text-red-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-300 mb-4">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthErrorBoundary;
