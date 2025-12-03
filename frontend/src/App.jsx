import "./App.css";
import "./custom.css";
import { navbarTheme } from "./constant/index";
import { useUser } from "./redux/slices/authSlice";
import React, { lazy, Suspense, useEffect } from "react";
import { RouterProvider } from "react-router-dom"; // Use RouterProvider
import { Toaster } from "react-hot-toast";
import { Routes } from "./routes/Routes"; // Import the Routes configuration
import Loading from "./pages/Loading";
import ErrorFallback from "./pages/ErrorFallback";
import { ErrorBoundary } from "react-error-boundary";


function App() {
  const { themeIndex, user } = useUser();

  useEffect(() => {
    console.log("Bismillah! In the name of Allah.");
  }, []);

  if (process.env.NODE_ENV === "production") {
    console.log = function () { };     // disables console.log
    console.debug = function () { };   // disables console.debug
    console.warn = function () { };    // optionally disable warnings
    console.error = function () { };   // optionally disable errors
  }

  return (
    <main className={`${navbarTheme[themeIndex]} max-w-[2200px] mx-auto`}>
      <Toaster position="top-center" />
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<Loading />}>
          <RouterProvider router={Routes} />
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}

export default App;