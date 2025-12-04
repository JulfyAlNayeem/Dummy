import React from 'react'
import ActiveFirefly2 from '../Svg/ActiveFirefly2'
import activeFireFlyJar from "../../assets/icons/activeFireFlyJar.png";

const ActiveUserList = ({ activeUsers }) => {

    return (
        <div className="px-4 py-2">
            <div className="flex items-center justify-center ]">
                <img src={activeFireFlyJar} className="w-12 h-14 " alt="" />
                {/* <h3 className="text-gray-300 text-sm font-medium">Active Users</h3> */}
            </div>

            <div className="mt-2  max-h-48 overflow-y-auto grid grid-cols-3 overflow-x-hidden">
                {activeUsers?.length > 0 ? (
                    activeUsers.map((activeUser, index) => (
                        <div
                            key={index}
                            className="flex items-center flex-col justify-center  gap-1 text-xs hover:bg-gray-700/20 p-2 rounded animate__animated animate__pulse animate__faster"
                        >
                            <div className="w-12 h-12 flex items-center justify-center relative">
                                <img src={activeUser.image} alt={activeUser.name} className="w-full h-full avatar" />
                                <span className="absolute -bottom-2 -right-4   rounded-full 0">
                                    <ActiveFirefly2 />
                                </span>
                            </div>
                            {/* <span className=" truncate text-xs">{activeUser.name}</span> */}
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 flex flex-col items-center justify-center py-8 px-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-full flex items-center justify-center mb-3 border border-gray-600/30">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-400 text-center font-medium">No active users</p>
                        <p className="text-xs text-gray-500 text-center mt-1">Waiting for fireflies to join...</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ActiveUserList
