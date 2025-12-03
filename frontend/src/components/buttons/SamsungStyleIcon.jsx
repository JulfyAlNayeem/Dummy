import React from 'react';

const SamsungStyleIcon = ({ iconImage, Icon }) => {
  return (
    <div className="icon-wrap relative">
      <div>
        {/* {iconImage && (
          <img src={iconImage} alt="icon" />
        )} */}
        {Icon && (
          <div className="">{Icon}</div>
        )}
      </div>
    </div>
  );
};

export default SamsungStyleIcon;
