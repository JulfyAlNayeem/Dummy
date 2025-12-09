import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "../context-reducer/UserAuthContext";
import { toast } from "react-hot-toast";
import AuthWrapper from "@/components/signinandup/AuthWrapper";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

const SignUp = () => {
  const { registerUser } = useUserAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    reEnterEmail: "",
    password: "",
    reEnterPassword: "",
    gender: "male",
  });
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateStep = () => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!formData.name) newErrors.name = "Name is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
    } else if (currentStep === 2) {
      if (!formData.email) newErrors.email = "Email is required";
      if (formData.email !== formData.reEnterEmail)
        newErrors.reEnterEmail = "Emails do not match";
    } else if (currentStep === 3) {
      if (!formData.password) newErrors.password = "Password is required";
      if (formData.password !== formData.reEnterPassword)
        newErrors.reEnterPassword = "Passwords do not match";
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (formData.password && !passwordRegex.test(formData.password)) {
        newErrors.password = "Password must contain at least one lowercase letter, one uppercase letter, and one number";
      }
    }
    return newErrors;
  };

  const handleNext = () => {
    const validationErrors = validateStep();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateStep();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const { name, email, password, gender } = formData;
      const response = await registerUser({ name, email, password, gender });
      
      if (response.status === 201) {
        toast.success(response.message || "Registration successful!");
        navigate("/signin");
      } else {
        toast.error(response?.data?.error?.message || "Something went wrong.");
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Registration failed. Please try again.";
      console.error("Registration error:", {
        message: error.message || "No error message available",
        status: error.response?.status || "No status available",
        data: error.response?.data || "No data available",
      });
      toast.error(message);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div>
              <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1"> Name </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                  className="w-full bg-[#e3fbfe] h-10 text-slate-900 text-base outline-none px-4 py-3 rounded-full border-2 border-[#44aecf]"
              />
              {errors.name && <span className="text-red-500">{errors.name}</span>}
            </div>
            <div>
              <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1"> Gender </label>
              <Select
                value={formData.gender}
                defaultValue="male"
                onValueChange={(val) => handleChange({ target: { name: "gender", value: val } })}
              >
                <SelectTrigger
                  className="w-full h-10 bg-[#e3fbfe] text-slate-900 text-base focus:ring-0 focus:outline-none rounded-full shadow-none px-4 flex items-center border-2 border-[#44aecf]"
                >
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent className="bg-white text-blue-400 border-transparent rounded-b-md shadow-md`">
                  <SelectItem
                    value="male"
                    className="focus:bg-blue-500 focus:text-white cursor-pointer"
                  >
                    Male
                  </SelectItem>
                  <SelectItem
                    value="female"
                    className="focus:bg-blue-500 focus:text-white cursor-pointer"
                  >
                    Female
                  </SelectItem>
                  <SelectItem
                    value="other"
                    className="focus:bg-blue-500 focus:text-white cursor-pointer"
                  >
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <span className="text-red-500">{errors.gender}</span>}
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div>
              <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1">Fake Email </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                  className="w-full bg-[#e3fbfe] h-10 text-slate-900 text-base outline-none px-4 py-3 rounded-full border-2 border-[#44aecf]"
              />
              {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
            </div>
            <div>
              <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1"> Re-enter Fake Email </label>
              <input
                type="email"
                name="reEnterEmail"
                value={formData.reEnterEmail}
                onChange={handleChange}
                  className="w-full bg-[#e3fbfe] h-10 text-slate-900 text-base outline-none px-4 py-3 rounded-full border-2 border-[#44aecf]"
              />
              {errors.reEnterEmail && <span className="text-red-500">{errors.reEnterEmail}</span>}
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div>
              <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1"> Password </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                  className="w-full bg-[#e3fbfe] h-10 text-slate-900 text-base outline-none px-4 py-3 rounded-full border-2 border-[#44aecf]"
              />
              {errors.password && <span className="text-red-500">{errors.password}</span>}
            </div>
            <div>
              <label className="inline-block text-sm text-[#e8f0fe] bg-transparent md:bg-[#e3fbfe] md:text-slate-700 md:px-2 md:py-1 md:rounded-full capitalize mb-1"> Re-enter Password </label>
              <input
                type="password"
                name="reEnterPassword"
                value={formData.reEnterPassword}
                onChange={handleChange}
                  className="w-full bg-[#e3fbfe] h-10 text-slate-900 text-base outline-none px-4 py-3 rounded-full border-2 border-[#44aecf]"
              />
              {errors.reEnterPassword && <span className="text-red-500">{errors.reEnterPassword}</span>}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <AuthWrapper welcomeMessage="Let's begin with " pageName="Sign Up">
      <div className="space-y-2">
        <div className="flex items-center justify-center">
          <div className="flex w-1/3 justify-center space-x-2 mb-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  step <= currentStep ? 'bg-[#3da4ca]' : ''
                }`}
              ></div>
            </div>
          ))}
        </div>
        </div>
        <div className=" space-y-4">
          {renderStep()}
        </div>
        <div className="flex justify-between pt-1">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`w-1/3 h-10 flex items-center justify-center bg-transparent border-2 border-[#0472a6] text-[#3da4ca] rounded-full ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Previous
          </button>
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-1/3 h-10 flex items-center justify-center bg-[#3da4ca] hover:bg-[#0472a6] text-white rounded-full relative overflow-hidden group"
            >
              <span className="relative z-10">Next</span>
            </button>
          ) : (
            <button
              type="submit"
              onClick={handleSubmit}
              className="w-1/3 h-10 flex items-center justify-center bg-[#3da4ca] hover:bg-[#0472a6] text-white rounded-full relative overflow-hidden group"
            >
              <span className="relative z-10">Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
};

export default SignUp;