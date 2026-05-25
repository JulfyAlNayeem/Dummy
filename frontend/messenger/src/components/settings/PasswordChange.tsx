// @ts-nocheck
import React, { useState } from 'react';
import { sidebarBg } from '../../constant';

import { useUserAuth } from '../../context-reducer/UserAuthContext';
import { getToken } from '../../context-reducer/localStorageService';

const PasswordChange = (): JSX.Element => {
 
    const { themeIndex }: any = useUser();
    const { changeUserPassword }: any = useUserAuth();
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [serverError, setServerError] = useState<any>({});
    const [serverMsg, setServerMsg] = useState<any>({});
    const { access_token }: any = getToken();

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage('New password and confirm password do not match.');
        } else {
            const actualData = {
                password: newPassword,
                password2: confirmPassword,
            };
            try {
                const res = await changeUserPassword({ actualData, token: access_token });
                if (res.error) {
                    setServerMsg({});
                    setServerError(res.error.data.errors);
                } else {
                    setServerError({});
                    setServerMsg(res);
                    setMessage('Password successfully changed!');
                    document.getElementById("password-change-form").reset();
                }
            } catch (error) {
                console.error('Password change error:', error);
                setServerError({ message: 'Failed to change password. Please try again.' });
            }
        }
    };

    return (
        <div className={`${sidebarBg[themeIndex]} min-h-screen flex items-center justify-center`}>
            <div className="p-8 rounded-lg shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">Change Password</h2>
                <form onSubmit={handleSubmit} id="password-change-form">
                   
                    <div className="mb-4">
                        <label className="block text-gray-700">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg mt-2 outline-blue-500"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg mt-2 outline-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white p-2 rounded-lg mt-4 hover:bg-blue-600 outline-blue-500"
                    >
                        Change Password
                    </button>
                    {message && <p className="mt-4 text-center text-green-500">{message}</p>}
                    {serverError.message && <p className="mt-4 text-center text-red-500">{serverError.message}</p>}
                    {serverMsg.message && <p className="mt-4 text-center text-green-500">{serverMsg.message}</p>}
                </form>
            </div>
        </div>
    );
};

export default PasswordChange;
