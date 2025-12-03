import React, { lazy, Suspense, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Loading from "./pages/Loading";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./pages/ErrorFallback";
import ChatRoom from "./pages/ChatRoom";
import ProtectedRoute from "./ProtectedRoute";
import { useUserAuth } from "./context-reducer/UserAuthContext";
import { getToken } from "./context-reducer/localStorageService";
import Account from "./pages/settings/Account";
import Security from "./pages/settings/Security";
import SettingsLayout from "./components/settings/SettingsLayout";
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));

const Links = () => {

  const { accessToken } = useUserAuth();
  const {access_token} = getToken()

  return (
    <BrowserRouter>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route exact path="/" element={<ProtectedRoute />}>
            <Route exact path="/" element={<Home />} />
            <Route exact path="/tb/:chatroom_id" element={<ChatRoom />} />
            <Route
              exact
              path="/settings/account"
              element={
                <SettingsLayout>
                  <Account />
                </SettingsLayout>
              }
            />
            <Route
              exact
              path="/settings/security"
              element={
                <SettingsLayout>
                  <Security />
                </SettingsLayout>
              }
            />
          </Route>
          <Route
            exact
            path="/signin"
            element={!accessToken ? <SignIn /> : <Navigate to="/" />}
          />
          <Route
            exact
            path="/signup"
            element={!accessToken ? <SignUp /> : <Navigate to="/" />}
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  </BrowserRouter>
  );
};

export default Links;

