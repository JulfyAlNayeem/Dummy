import SiteSecuritypage from "@/pages/SiteSecuritypage";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const AuthWrapper = ({ children, pageName, welcomeMessage }) => {
  const [isTransparent, setIsTransparent] = useState(true);
  const [isVerified, setIsVerified] = useState(null);
  let location = useLocation();

  useEffect(() => {
    // Check local storage for isVerified
    const verifiedStatus = localStorage.getItem("isVerified");
    setIsVerified(verifiedStatus);
  }, []);

  useEffect(() => {
    if (location.pathname === "/signin") {
      setIsTransparent(true);
    } else {
      setIsTransparent(false);
    }
  }, [location]);

  // If isVerified is not "true", render SiteSecuritypage
  if (isVerified !== "true") {
    return <SiteSecuritypage setIsVerified={setIsVerified}/>;
  }

  return (
    <main className="bg-[#6981d6] max-w-[1920px] mx-auto h-full">
      <section className="flex items-center flex-col md:flex-row md:justify-between py-10 bg-slate-950 h-screen overflow-y-scroll md:gap-5 p-10">
        {/* Welcome Section */}
        <div className="border-t-2 border-b-2 rounded-full border-purple-900 p-2 w-full md:w-2/3">
          <div className="border-t-2 border-b-2 rounded-full border-purple-800 p-2">
            <div className="border-t-2 border-b-2 border-purple-700 rounded-full p-2 text-center">
              <span className="text-2xl font-bold uppercase font-open text-gray-50">
                Welcome to <span className="text-purple-900">Al - </span>
                <span className="text-blue-400">Fajr</span>
              </span>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="md:border-l-2 border-l-0 md:rounded-[90px] border-purple-900 p-2 md:w-1/3 w-full overflow-y-scroll">
          <div className="md:border-l-2 border-l-0 md:rounded-[90px] border-purple-800 p-2">
            <div className="md:border-l-2 border-l-0 border-purple-700 md:rounded-[90px] space-y-4 md:pl-7 pb-7">
              <div className="flex justify-center items-center py-5 w-full">
                <div className="text-center flex items-center relative justify-center w-full">
                  <div className="between gap-8 w-full">
                    <Link
                      to="/signin"
                      className={`font-semibold text-sm ${
                        isTransparent
                          ? "bg-blue-400 text-purple-900"
                          : "bg-transparent text-blue-400"
                      } text-center rounded-2xl rounded-bl-md border-2 border-blue-400 px-5 w-1/3 py-4 transition-colors duration-1000`}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className={`font-semibold text-sm ${
                        isTransparent
                          ? "bg-transparent text-blue-400"
                          : "bg-blue-400 text-purple-900"
                      } text-center rounded-2xl rounded-br-md border-2 border-blue-400 px-5 w-1/3 py-4 transition-colors duration-1000`}
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              </div>
              {children}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AuthWrapper;