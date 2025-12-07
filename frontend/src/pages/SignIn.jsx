import React, { useEffect, useState } from "react";
import AuthWrapper from "../components/signinandup/AuthWrapper";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { setEncryptedToken } from "@/utils/tokenStorage";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

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

  useEffect(() => {
    if (user) {
      navigate("/"); // Use navigate instead of window.location.href
    }
  }, [user, navigate]);

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
      navigate("/");
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
          <label className="text-sm text-gray-400 capitalize block mb-1">
            Email
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            className="w-full border-b border-purple-900 bg-transparent text-blue-400 text-sm outline-none p-1 border-t-0 border-l-0 border-r-0 rounded-none focus-visible:ring-0"
          />
          {errors.email && <span className="text-red-500">{errors.email}</span>}
        </div>
        <div>
          <label className="text-sm text-gray-400 capitalize block mb-1">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="w-full border-b border-purple-900 bg-transparent text-blue-400 text-sm outline-none p-1 pr-10 border-t-0 border-l-0 border-r-0 rounded-none focus-visible:ring-0"
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
          className="w-full bg-[#3da4ca] hover:bg-[#0472a6] text-white rounded-full py-2 relative overflow-hidden group"
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