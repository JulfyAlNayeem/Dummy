// SettingsLayout.js
import React from 'react';
import SettingSidebar from './SettingSidebar';


const SettingsLayout = ({ children }) => {
  return (
    <div className="between gap-4 h-full">
      <SettingSidebar />
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default SettingsLayout;
