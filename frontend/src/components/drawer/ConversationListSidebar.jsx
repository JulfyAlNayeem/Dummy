import React, { useState } from 'react';
import { FaChevronLeft } from "react-icons/fa";
import { MdLinkedCamera, MdOutlineSettingsSuggest } from "react-icons/md";
import { IoLogOut, IoPerson } from "react-icons/io5";
import { useNavigate, Link } from 'react-router-dom';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import chatIcon from "@/assets/icons/chatIcon.svg";
import { sheetColor, sidebarBg } from '../../constant';
import { Button } from '@/components/ui/button';
import ProfilePictureUploader from "../popup/ProfilePictureUploader";
import SettingsModal from '../Conversation/SettingModal';
import 'animate.css';
import ActiveUserList from './ActiveUserList';
import { removeToken } from '@/utils/tokenStorage';
import { useDispatch } from 'react-redux';
import { useUser } from '@/redux/slices/authSlice';
import { logout } from '@/redux/slices/authSlice';

const ConversationListSidebar = ({ isOpen, setIsOpen, themeIndex }) => {
    const { user, onlineUsers, logoutUser } = useUserAuth();
    const [isOpenPopup, setIsOpenPopup] = useState(false);
    const [selectedTab, setSelectedTab] = useState("illustrations");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    // const {logout} = useUser();

    const handleLogout = async () => {
        try {
            dispatch(logout());
            navigate('/signin');
            localStorage.clear();
            const response = await logoutUser();
            
            
            // if (response?.message === "Logged out successfully" || response?.status === 200) {
            // conavigate('/signin');
                
            // } else {
            //     console.error('Logout failed: Invalid response', response);
            // }
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <img src={chatIcon} className="w-16 mx-auto mb-4" alt="Chat Icon" />
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4">Loading user data...</p>
                </div>
            </div>
        );
    }

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40 animate__animated animate__fadeIn animate__faster"
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 w-72 h-full ${sheetColor[themeIndex]} text-white overflow-y-auto shadow-2xl z-50 animate__animated ${isOpen ? 'animate__slideInLeft animate__faster' : 'animate__slideOutLeft animate__faster'}`}
            >
                <div className="flex flex-col min-h-full">
                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="relative flex items-center space-x-4 p-4">
                            <div className="border-blue-500/20 ring-2  ring-transparent group">
                                <div className="group avatar  relative overflow-hidden cursor-pointer">
                                    {user.image ?
                                        <img src={`${user.image}`} alt="Profile" className="size-10  border-transparent" />
                                        : <div className="size-16 rounded-full bg-gray-500 flex items-center justify-center text-white ">{user.name?.[0] || 'U'}</div>}
                                    <button
                                        className="absolute flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 w-full left-0 right-0 bottom-0 bg-sky-500/50 pt-0.5 pb-1"
                                        onClick={() => setIsOpenPopup(true)}
                                        aria-label="Update profile picture"
                                    >
                                        <MdLinkedCamera className='text-2xl' />
                                    </button>
                                </div>
                               
                            </div>
                            <div className="flex-1">
                                <h2 className="text-sm font-semibold truncate">{user.name || 'User'}</h2>
                                <p className="text-xs text-gray-100 truncate">{user.email || 'No email'}</p>
                            </div>
                            <div className="absolute right-0 top-2">
                                <button
                                    className="bg-green-600 w-12 h-10 rounded-l-full z-50 flex items-center justify-center hover:bg-green-700 transition-colors animate__animated animate__pulse animate__faster"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close sidebar"
                                >
                                    <FaChevronLeft className="text-white" />
                                </button>
                            </div>
                        </div>

                        <nav className="flex-1 px-4 py-2 overflow-y-auto text-sm flex items-center justify-evenly">
                            <div className="animate__animated animate__pulse animate__faster">
                                <Button
                                    className="w-full sidebar-card flex items-center justify-start space-x-2 p-2"
                                    onClick={() => setIsSettingsOpen(true)}
                                >
                                    <MdOutlineSettingsSuggest className="text-green-500 text-xl" />
                                    <span>Settings</span>
                                </Button>
                            </div>

                            <div className="animate__animated animate__pulse animate__faster">
                                <button className="w-full sidebar-card flex items-center space-x-2 p-2" onClick={handleLogout}>
                                    <IoLogOut className="text-red-500 text-xl" />
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </nav>

                        <ActiveUserList activeUsers={onlineUsers} />
                    </div>

                    {/* Bottom Al Fajr Section */}
                    {/* <div className={`mt-auto w-full py-4 text-center ${sidebarBg[themeIndex] || 'bg-gray-900'}`}>
                        <img src={chatIcon} alt="Al Fajr Logo" className="w-12 mx-auto mb-1" />
                        <p className="font-semibold text-sm">Al Fajr</p>
                        <p className="text-xs text-gray-400">v1.0.0</p>
                    </div> */}
                </div>
            </div>

            {isOpenPopup && (
                <ProfilePictureUploader
                    selectedTab={selectedTab}
                    setSelectedTab={setSelectedTab}
                    isOpenPopup={isOpenPopup}
                    setIsOpenPopup={setIsOpenPopup}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal
                    isOpen={isSettingsOpen}
                    setIsOpen={setIsSettingsOpen}
                    user={user}
                />
            )}
        </>
    );
};

export default ConversationListSidebar;