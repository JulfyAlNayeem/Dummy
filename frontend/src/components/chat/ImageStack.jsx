
import React from 'react';

const ImageStack = ({ img, onImageClick }) => {

  return (
    <div className="relative w-48 h-36 cursor-pointer" onClick={() => onImageClick(0)}>
      <div className="absolute top-0 left-0 w-full h-full rounded-lg p-2">
        {img[0] && (
          <img
            src={img[0].img}
            alt="Image 1"
            className="w-full h-full object-cover rounded-lg shadow-lg transform rotate-[-10deg] translate-x-2 translate-y-2 hover:opacity-90 transition-opacity"
          />
        )}
      </div>
      <div className="absolute top-0 left-0 w-full h-full rounded-lg p-2">
        {img[1] && (
          <img
            src={img[1].img}
            alt="Image 2"
            className="w-full h-full object-cover rounded-lg shadow-lg transform rotate-[5deg] translate-x-4 translate-y-4"
          />
        )}
      </div>
      <div className="absolute top-0 left-0 w-full h-full rounded-lg p-2">
        {img[2] && (
          <img
            src={img[2].img}
            alt="Image 3"
            className="w-full h-full object-cover rounded-lg shadow-lg transform rotate-[15deg] translate-x-6 translate-y-6"
          />
        )}
      </div>
    </div>
  );
};

export default ImageStack;
