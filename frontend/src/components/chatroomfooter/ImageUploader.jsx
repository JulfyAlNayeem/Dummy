import React from 'react';
import { FaRegImages } from 'react-icons/fa6';
import { borderColor, cardClass } from '../../constant';
import { useUser } from '@/redux/slices/authSlice';

const ImageUploader = ({ themeIndex, setSelectedImages }) => {
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const images = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setSelectedImages((prevImages) => [...prevImages, ...images]);
  };
  return (
    <button className={`${cardClass[themeIndex]}  rounded-full `}>
      <label className="cursor-pointer w-full text-sm flex items-center justify-center py-2">
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        <span><FaRegImages className="text-lg" /></span>
      </label>
    </button>
  );
};

export default ImageUploader;