
import React from 'react';
import ImageStack from './ImageStack';


const ImageDisplay = ({ img, onImageClick }) => {
  const imageCount = img.length;

  // Single image - display normally without rotation
  if (imageCount === 1) {
    return (
      <div className=" w-48 h-36 cursor-pointer" onClick={() => onImageClick(0)}>
        <img
          src={img[0].img}
          alt="Single image"
          className="w-full h-full object-cover rounded-lg shadow-lg hover:opacity-90 transition-opacity"
        />
      </div>
    );
  }

  // Two images - side by side layout
  if (imageCount === 2) {
    return (
      <div className="flex gap-2 w-64 h-32">
        <img
          src={img[0].img}
          alt="Image 1"
          className="w-1/2 h-full object-cover rounded-lg shadow-lg transform rotate-[-3deg] cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick(0)}
        />
        <img
          src={img[1].img}
          alt="Image 2"
          className="w-1/2 h-full object-cover rounded-lg shadow-lg transform rotate-[3deg] cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick(1)}
        />
      </div>
    );
  }

  // Three or more images - use the existing stacked style
  return <ImageStack img={img} onImageClick={onImageClick} />;
};

export default ImageDisplay;
