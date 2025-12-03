import React from 'react'
import { sidebarBg } from '../../constant';

import { Link } from 'react-router-dom';
import { MdManageAccounts } from "react-icons/md";
import { FiKey } from "react-icons/fi";

export default function SettingSidebar() {
  const { themeIndex } = useUser();

  return (
    <div className={`${sidebarBg[themeIndex]} w-72 h-screen text-sky-200`}>
      <nav className="flex flex-col lg:flex-row lg:h-screen ">
        <div className="lg:h-full lg:border-r border-gray-300 lg:w-64 px-4 py-3">
          <div className="flex justify-between items-center lg:py-5 mb-5">
           
            <a href="#" className="flex items-center space-x-2">
              <img src="" alt="Logo" className="h-8" />
            </a>
            <div className="lg:hidden">
              <img src="" alt="Profile" className="w-8 h-8 rounded-full" />
            </div>
          </div>
          <ul className="space-y-2">
            <li><Link className="flex items-center space-x-2 "><MdManageAccounts className='text-2xl text-oceanBlue'/><span>Account</span></Link></li>
            <li><Link className="flex items-center space-x-2 "><FiKey className='text-2xl text-purple-600'/><span>Password</span></Link></li>
            
          </ul>
          <hr className="my-5 border-gray-300" />
         
        </div>
      </nav>
    </div>
  )
}
