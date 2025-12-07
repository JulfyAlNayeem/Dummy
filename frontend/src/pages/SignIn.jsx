import React, { useEffect, useState } from "react";
import AuthWrapper from "../components/signinandup/AuthWrapper";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { setEncryptedToken } from "@/utils/tokenStorage";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { BASE_URL } from "@/utils/baseUrls";

const SignIn = () => {
  const auth = useUserAuth();
  const { loginUser } = auth || {};
  const { user } = auth || {};
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "email" ? value.toLowerCase() : value,
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password === "password") newErrors.password = "Please enter a valid password";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await loginUser(formData);
      setEncryptedToken("accessToken", response.access);
      setEncryptedToken("refreshToken", response.refresh);
      toast.success(response.message || "Login successful");
      
      // Fetch user's latest conversation
      try {
        const conversationsResponse = await fetch(`${BASE_URL}conversations/${response.user._id}`, {
          headers: {
            'Authorization': `Bearer ${response.access}`,
            'Content-Type': 'application/json'
          }
        });
        const conversations = await conversationsResponse.json();
        
        // Redirect to first conversation if exists
        if (conversations && conversations.length > 0) {
          navigate(`/e2ee/t/${conversations[0]._id}`, { replace: true });
        } else {
          // No conversations, go to empty chat state
          navigate('/e2ee/t/empty', { replace: true });
        }
      } catch (convError) {
        console.error('Failed to fetch conversations:', convError);
        // Fallback to empty chat state
        navigate('/e2ee/t/empty', { replace: true });
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Login failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthWrapper welcomeMessage="Welcome to " pageName="Sign In">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1">
            Email
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
              className="w-full bg-[#e3fbfe] h-10 text-[#43aece] text-base outline-none px-4 py-3 rounded-full border-2 border-[#44aecf] focus-visible:ring-0"
          />
          {errors.email && <span className="text-red-500">{errors.email}</span>}
        </div>
        <div>
          <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
                className="w-full bg-[#e3fbfe] text-[#43aece] text-base outline-none px-4 py-4 h-10 pr-10 rounded-full border-2 border-[#44aecf] focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <span className="text-red-500">{errors.password}</span>
          )}
        </div>
        <button
          type="submit"
          className="w-full h-10 flex items-center justify-center bg-[#3da4ca] hover:bg-[#0472a6] text-white rounded-full relative overflow-hidden group"
          disabled={isSubmitting}
        >
          <span className="relative z-10">
            {isSubmitting ? "Signing..." : "Sign In"}
          </span>
        </button>
      </form>
    </AuthWrapper>
  );
};

export default SignIn;