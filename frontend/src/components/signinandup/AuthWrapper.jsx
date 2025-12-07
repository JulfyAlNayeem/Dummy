import SiteSecuritypage from "@/pages/SiteSecuritypage";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// AuthWrapper: provides a split-screen layout (illustration left, form right)
// Keeps existing colors but changes layout to match the requested pattern.
const AuthWrapper = ({ children, pageName, welcomeMessage }) => {
  // default to verified (true) unless localStorage explicitly says otherwise
  const [isVerified, setIsVerified] = useState(() => {
    const stored = localStorage.getItem("isVerified");
    return stored == null ? true : stored === "true";
  });
  const location = useLocation();

  // sync with localStorage (if another tab updates it)
  useEffect(() => {
    const verifiedStatus = localStorage.getItem("isVerified");
    if (verifiedStatus != null) setIsVerified(verifiedStatus === "true");
  }, []);

  // If user hasn't passed the site-security check, show that page
  if (!isVerified) {
    return <SiteSecuritypage setIsVerified={setIsVerified} />;
  }

  return (
    <main className="min-h-screen w-full bg-signin flex items-center justify-center relative">
      <div className="absolute inset-0 bg-black/10 z-0 pointer-events-none" />
      <div className="flex w-full max-w-6xl h-screen md:h-[86vh] shadow-2xl rounded-lg overflow-hidden flex-col md:flex-row relative z-10">
        {/* Left illustration / marketing area */}
        <div className="hidden md:flex w-2/3 bg-cover bg-center items-center justify-center bg-rocketsmall" >
          <div className="p-12 text-white max-w-md">
            {/* Example content: keep simple so it's easy to customize */}
            <h2 className="text-3xl font-bold mb-4">{welcomeMessage || 'Welcome'}</h2>
            <p className="text-sm opacity-90">
              Plan your activities and control your progress online. Use the right side to
              sign in or create a new account.
            </p>
          </div>
        </div>

        {/* Right form area */}
        <div
          className="flex w-full h-full md:w-1/2 items-center bg-rocketsmall md:bg-none md:bg-transparent justify-center bg-cover bg-center relative">
          {/* translucent card on top of the background to keep the form readable */}
          <div className="w-full h-full p-8 backdrop-blur-sm  shadow-md">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{pageName || 'Auth'}</h1>
                <p className="text-sm text-[#def6ff]">Use your credentials to continue</p>
              </div>
              <div className="flex items-center justify-center w-auto">
                <div className="flex items-center bg-slate-700/40 rounded-full p-1">
                  <Link
                    to="/signin"
                    className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                      location.pathname === '/signin'
                        ? 'bg-[#3da4ca] hover:bg-[#0472a6] text-white shadow-md'
                        : 'text-slate-300 bg-transparent'
                    }`}
                  >
                    Sign In
                  </Link>

                  <Link
                    to="/signup"
                    className={`ml-1 px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                      location.pathname === '/signup'
                        ? 'bg-[#3da4ca] hover:bg-[#0472a6] text-white shadow-md'
                        : 'text-slate-300 bg-transparent'
                    }`}
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-transparent text-slate-900 dark:text-slate-100">{children}</div>

            <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-300">
              By continuing you agree to our terms and privacy policy.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AuthWrapper;