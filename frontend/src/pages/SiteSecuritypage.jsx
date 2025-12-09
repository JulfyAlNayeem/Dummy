import React, { useState, useEffect } from "react";
import "animate.css";
import rocket from "../assets/background/rocket.webp";
import { useVerifySecurityMessageMutation } from "@/redux/api/securityApi";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { useGetAllConversationsQuery } from "@/redux/api/conversationApi";
import { toast } from "react-hot-toast";

const SiteSecuritypage = () => {
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const { data: conversations } = useGetAllConversationsQuery(user?._id, { 
    skip: !user?._id 
  });
  const [clickCount, setClickCount] = useState(0);
  const [isLaunched, setIsLaunched] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ message: '' });

  const [verifySiteSecurityMessage, { isLoading: isVerifyingMessages, error: verifyError, isSuccess }] = useVerifySecurityMessageMutation();

  // Redirect logged-in users to their first conversation
  useEffect(() => {
    if (user && conversations) {
      const firstConvId = conversations[0]?._id;
      if (firstConvId) {
        navigate(`/e2ee/t/${firstConvId}`);
      } else {
        // If no conversations exist, go to empty chat state
        navigate('/e2ee/t/empty');
      }
    }
  }, [user, conversations, navigate]);

  const handleClick = () => {
    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setIsLaunched(true);
      }
      return newCount;
    });
    setLastClickTime(Date.now());
  };

  const handleVerifyChange = (e) => {
    setVerifyForm({ message: e.target.value });
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await verifySiteSecurityMessage({ message: verifyForm.message }).unwrap();
      // persist verification as a string in localStorage
      localStorage.setItem("isVerified", "true");
      toast.success(`Message verified successfully as ${response.data.messageType}`);
      setVerifyForm({ message: '' });
      // Redirect to signin page after successful verification
      setTimeout(() => navigate('/signin'), 1500);
    } catch (err) {
      // persist failed verification explicitly
      localStorage.setItem("isVerified", "false");
      console.error('Verification error:', err);
      toast.error('Verification failed: ' + (err?.data?.message || err?.message || 'Unknown error'));
    }
  };

  useEffect(() => {
    if (lastClickTime === null) return;

    const timeout = setTimeout(() => {
      const timeSinceLastClick = Date.now() - lastClickTime;
      if (timeSinceLastClick >= 1000 && !isLaunched) {
        setClickCount(0);
        setLastClickTime(null);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [lastClickTime, isLaunched]);

  useEffect(() => {
    if (clickCount === 0 && isLaunched) {
      setIsLaunched(false);
    }
  }, [clickCount]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#e3f9ff] relative">
      {/* Rocket */}
      <img
        src={rocket}
        alt="Rocket background"
        className={`w-full h-full object-cover object-bottom ${
          isLaunched ? "animate__animated animate__slideOutUp animate__slow" : ""
        }`}
      />

      {/* Screen cover */}
      <div
        className={`absolute bottom-0 left-0 w-full h-screen bg-[#e3f9ff] flex items-center justify-center flex-col gap-4 ${
          isLaunched ? "animate__animated animate__fadeInUpBig" : "hidden"
        }`}
        style={{ animationDuration: "1600ms" }}
      >
        <h1 className="text-[#41a9cd] sm:text-4xl text-2xl font-bold">Rocket Launched!</h1>
        {/* Verify Message Form */}
        <div className="w-full max-w-md px-4">
          <form onSubmit={handleVerifySubmit} className="space-y-4 flex items-center flex-col justify-center">
              <input
                type="text"
                name="message"
                value={verifyForm.message}
                onChange={handleVerifyChange}
                className="mt-1 block w-full border border-[#41a9cd] rounded-md shadow-sm px-2 py-1.5 focus:ring-[#41a9cd] focus:border-[#41a9cd] text-[#41a9cd] bg-transparent"
                placeholder="Enter pin to verify"
                required
              />
            <button
              type="submit"
              disabled={isVerifyingMessages}
              className={`bg-[#40a5c9] text-white px-4 text-sm py-2 rounded transition-colors ${
                isVerifyingMessages ? "opacity-50 cursor-not-allowed" : "hover:bg-[#358aa3]"
              }`}
            >
              {isVerifyingMessages ? 'Verifying...' : 'Verify Message'}
            </button>
          </form>
        </div>
      </div>

      {/* Launch Button */}
      <div
        onClick={handleClick}
        className="absolute size-5 rounded-full bottom-4 right-4 bg-[#40a5c9] text-white transition-colors z-10"
      />
    </div>
  );
};

export default SiteSecuritypage;