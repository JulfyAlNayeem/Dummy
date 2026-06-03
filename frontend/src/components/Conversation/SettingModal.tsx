// @ts-nocheck
import React, { useState } from 'react';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import 'animate.css';
import { useUpdateNameMutation, useUpdateEmailMutation, useUpdatePasswordMutation } from 
 '@/redux/api/user/userApi';

const SettingsModal = ({ isOpen, setIsOpen, user }: any): JSX.Element => {
  const [activeForm, setActiveForm] = useState<string>('name');
  const [name, setName] = useState<string>(user.name || '');
  const [email, setEmail] = useState<string>(user.email || '');
  const [confirmEmail, setConfirmEmail] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [confirmEmailError, setConfirmEmailError] = useState<string>('');
  const [currentPasswordError, setCurrentPasswordError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');

  // RTK Query hooks
  const [updateName, { isLoading: isNameLoading }]: any = useUpdateNameMutation();
  const [updateEmail, { isLoading: isEmailLoading }]: any = useUpdateEmailMutation();
  const [updatePassword, { isLoading: isPasswordLoading }]: any = useUpdatePasswordMutation();

  // Email validation regex
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Handle name update
  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameError('');

    if (!name) {
      setNameError('Name is required');
      return;
    }
    if (name.length < 2 || name.length > 50) {
      setNameError('Name must be between 2 and 50 characters');
      return;
    }

    try {
      const result = await updateName(name).unwrap();
      toast.success(
        <div>
          <div className="font-bold">Success!</div>
          <div>{result.message}</div>
        </div>
      );
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error?.data?.message || 'Failed to update name';
      setNameError(errorMessage);
      toast.error(
        <div>
          <div className="font-bold">Error!</div>
          <div>{errorMessage}</div>
        </div>
      );
    }
  };

  // Handle email update
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setConfirmEmailError('');

    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('Invalid email format');
      return;
    }
    if (email !== confirmEmail) {
      setConfirmEmailError('Emails do not match');
      return;
    }

    try {
      const result = await updateEmail(email).unwrap();
      toast.success(
        <div>
          <div className="font-bold">Success!</div>
          <div>{result.message}</div>
        </div>
      );
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error?.data?.message || 'Failed to update email';
      setEmailError(errorMessage);
      toast.error(
        <div>
          <div className="font-bold">Error!</div>
          <div>{errorMessage}</div>
        </div>
      );
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setCurrentPasswordError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!currentPassword) {
      setCurrentPasswordError('Current password is required');
      return;
    }
    if (!password) {
      setPasswordError('New password is required');
      return;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    try {
      const result = await updatePassword({ currentPassword, newPassword: password }).unwrap();
      toast.success(
        <div>
          <div className="font-bold">Success!</div>
          <div>{result.message}</div>
        </div>
      );
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error?.data?.message || 'Failed to update password';
      setPasswordError(errorMessage);
      toast.error(
        <div>
          <div className="font-bold">Error!</div>
          <div>{errorMessage}</div>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] z-[100] bg-gradient-to-br from-gray-800 to-gray-900 text-white border-0 rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Update Your Profile</DialogTitle>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex justify-center space-x-4 mb-6">
          {['name', 'email', 'password'].map((tab) => (
            <div
              key={tab}
              className="animate__animated animate__pulse animate__faster"
              onMouseEnter={(e) => e.currentTarget.classList.add('animate__pulse')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('animate__pulse')}
            >
              <Button
                variant={activeForm === tab ? 'default' : 'outline'}
                onClick={() => {
                  setActiveForm(tab);
                  setNameError('');
                  setEmailError('');
                  setConfirmEmailError('');
                  setPasswordError('');
                  setConfirmPasswordError('');
                }}
                className={`px-4 py-2 rounded-full font-semibold ${
                  activeForm === tab
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                } transition-colors duration-300`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            </div>
          ))}
        </div>

        {/* Name Form */}
        {activeForm === 'name' && (
          <form
            onSubmit={handleUpdateName}
            className="space-y-6 animate__animated animate__slideInRight animate__faster"
          >
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-200">Name</label>
              <Input
                id="name"
                placeholder="Enter new name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 bg-gray-700 text-white border-gray-600 focus:border-green-500 focus:ring-green-500"
                disabled={isNameLoading}
              />
              {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 w-full rounded-full"
                disabled={isNameLoading}
              >
                {isNameLoading ? 'Updating...' : 'Update Name'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Email Form */}
        {activeForm === 'email' && (
          <form
            onSubmit={handleUpdateEmail}
            className="space-y-6 animate__animated animate__slideInRight animate__faster"
          >
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-200">New Email</label>
              <Input
                id="email"
                placeholder="Enter new email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-gray-700 text-white border-gray-600 focus:border-green-500 focus:ring-green-500"
                disabled={isEmailLoading}
              />
              {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
            </div>
            <div>
              <label htmlFor="confirmEmail" className="text-sm font-medium text-gray-200">Confirm Email</label>
              <Input
                id="confirmEmail"
                placeholder="Confirm new email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-2 bg-gray-700 text-white border-gray-600 focus:border-green-500 focus:ring-green-500"
                disabled={isEmailLoading}
              />
              {confirmEmailError && <p className="text-red-400 text-sm mt-1">{confirmEmailError}</p>}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 w-full rounded-full"
                disabled={isEmailLoading}
              >
                {isEmailLoading ? 'Updating...' : 'Update Email'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Password Form */}
        {activeForm === 'password' && (
          <form
            onSubmit={handleUpdatePassword}
            className="space-y-6 animate__animated animate__slideInRight animate__faster"
          >
            <div>
              <label htmlFor="currentPassword" className="text-sm font-medium text-gray-200">Current Password</label>
              <Input
                id="currentPassword"
                placeholder="Enter current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2 bg-gray-700 text-white border-gray-600 focus:border-green-500 focus:ring-green-500"
                disabled={isPasswordLoading}
              />
              {currentPasswordError && <p className="text-red-400 text-sm mt-1">{currentPasswordError}</p>}
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-200">New Password</label>
              <Input
                id="password"
                placeholder="Enter new password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 bg-gray-700 text-white border-gray-600 focus:border-green-500 focus:ring-green-500"
                disabled={isPasswordLoading}
              />
              {passwordError && <p className="text-red-400 text-sm mt-1">{passwordError}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">Confirm Password</label>
              <Input
                id="confirmPassword"
                placeholder="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 bg-gray-700 text-white border-gray-600 focus:border-green-500 focus:ring-green-500"
                disabled={isPasswordLoading}
              />
              {confirmPasswordError && <p className="text-red-400 text-sm mt-1">{confirmPasswordError}</p>}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 w-full rounded-full"
                disabled={isPasswordLoading}
              >
                {isPasswordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;