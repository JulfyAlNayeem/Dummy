import React from 'react';
import { FaRegImages } from 'react-icons/fa6';
import { themeCard } from '@/lib/themeUtils';
import { useUser } from '@/redux/slices/authSlice';

const ImageUploader = ({ themeIndex, setSelectedImages }: { themeIndex: number; setSelectedImages: (fn: (prev: any[]) => any[]) => void }): JSX.Element => {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files);
    const images = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setSelectedImages((prevImages) => [...prevImages, ...images]);
  };
  return (
    <button className={themeCard(themeIndex, "rounded-full")}>
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