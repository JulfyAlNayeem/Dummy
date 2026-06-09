import "./App.css";
import "./custom.css";
import { useUser } from "./redux/slices/authSlice";
import { themeNavbar } from "@/lib/themeUtils";
import React, { lazy, Suspense, useEffect } from "react";
import { RouterProvider } from "react-router-dom"; // Use RouterProvider
import { Toaster } from "react-hot-toast";
import GlobalRemindersProvider from './components/GlobalRemindersProvider';
import { Routes } from "./routes/Routes"; // Import the Routes configuration
import Loading from "./pages/Loading";
import ErrorFallback from "./pages/ErrorFallback";
import { ErrorBoundary } from "react-error-boundary";
import AuthErrorBoundary from "./pages/AuthErrorBoundary";


function App(): JSX.Element {
  const { themeIndex = 0, user }: any = useUser() || {};

  useEffect(() => {
    console.log("Bismillah! In the name of Allah.");
  }, []);

  // Fix mobile viewport height (100vh issue) by setting --vh CSS variable
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    window.addEventListener('focus', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
      window.removeEventListener('focus', setVh);
    };
  }, []);

  if (import.meta.env.MODE === "production") {
    console.log = function () { };     // disables console.log
    console.debug = function () { };   // disables console.debug
    console.warn = function () { };    // optionally disable warnings
    console.error = function () { };   // optionally disable errors
  }

  return (
    <main className={themeNavbar(themeIndex, "max-w-[2200px] mx-auto")}>
      <ErrorBoundary 
        FallbackComponent={ErrorFallback}
        onError={(error, errorInfo) => {
          // Log error in development
          if (import.meta.env.MODE === 'development') {
            console.error('App Error Boundary caught:', error, errorInfo);
          }
        }}
      >
        <Suspense fallback={<Loading />}>
          <RouterProvider router={Routes} />
        </Suspense>
      </ErrorBoundary>
      <GlobalRemindersProvider />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </main>
  );
}

export default App;