import React from 'react';

const SamsungStyleIcon = ({ iconImage, Icon }: { iconImage?: string; Icon?: React.ReactNode }): JSX.Element => {
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
