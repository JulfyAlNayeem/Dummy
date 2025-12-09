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
    <main className="min-h-screen w-full bg-signin flex items-center justify-center">
      <div className="flex w-full max-w-6xl h-screen md:h-[86vh] shadow-2xl rounded-lg overflow-hidden flex-col md:flex-row">
        
        {/* Left illustration / marketing area */}
        <div className="hidden md:flex w-2/3 bg-cover bg-bottom pt-2 items-center justify-start px-8 -mt-40 bg-rocketsmall" >
        
          <div className=" text-white  max-w-md">
              {/* Stylish space-themed content for the left panel */}
              <div className="inline-block mb-3 px-3 py-1 rounded-full bg-[#001231]/30 text-xs font-medium tracking-wide">
                Explore • Beyond
              </div>

              <h2 className="text-3xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#3da4ca] via-[#0472a6] to-[#001231]">
                {welcomeMessage || 'Paper Rocket Agency'} Paper Rocket Agency
              </h2>

              <p className="text-sm opacity-90 leading-relaxed mb-4">
                Sail the cosmic seas — discover ideas that orbit possibility. Chart your
                path among the stars, track progress like a mission log, and build a
                universe of small wins that add up to giant leaps.
              </p>

              <div className="mt-3 text-xs text-[#def6ff] bg-[#001231]/20 inline-block px-3 py-1 rounded-md">
                Inspired by space — small steps, big horizons
              </div>
          </div>
        </div>

        {/* Right form area */}
        <div
          className="flex w-full h-full md:w-1/2 items-center bg-rocketsmall md:bg-none md:bg-transparent justify-center bg-cover bg-center relative">
          {/* translucent card on top of the background to keep the form readable */}
          <div className="w-full h-full p-8 backdrop-blur-sm  shadow-md">
            <div className="flex sm:hidden items-center justify-center mb-10">
              <h2 className="text-3xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#3da4ca] via-[#0472a6] to-[#001231]">
                 Paper Rocket Agency
              </h2>
              
            </div>
            
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-[#dff5ff]">{pageName || 'Auth'}</h1>
                <p className="text-sm text-[#def6ff]">Use your credentials to continue</p>
              </div>
              <div className="flex sm:block  items-center justify-center min-w-[154px]">
                <div className="flex items-center bg-[#35a9cd]/40 rounded-full p-1">
                  <Link
                    to="/signin"
                    className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                      location.pathname === '/signin'
                        ? 'bg-[#3da4ca] hover:bg-[#0472a6] text-white shadow-md'
                        : 'text-sky-50 bg-transparent'
                    }`}
                  >
                    Sign In
                  </Link>

                  <Link
                    to="/signup"
                    className={`ml-1 px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                      location.pathname === '/signup'
                        ? 'bg-[#3da4ca] hover:bg-[#0472a6] text-white shadow-md'
                        : 'text-sky-50 bg-transparent'
                    }`}
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
              {/* <div className="text-4xl">🚀</div> */}
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