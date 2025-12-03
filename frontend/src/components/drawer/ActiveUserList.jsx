import React from 'react'
import ActiveFirefly2 from '../Svg/ActiveFirefly2'
import activeFireFlyJar from "../../assets/icons/activeFireFlyJar.png";

const ActiveUserList = ({activeUsers}) => {

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
                                    <ActiveFirefly2/>
                                </span>
                            </div>
                            {/* <span className=" truncate text-xs">{activeUser.name}</span> */}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-400">No active users</p>
                )}
            </div>
        </div>
    )
}

export default ActiveUserList
