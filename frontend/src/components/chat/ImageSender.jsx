
import React, { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '../ui/button';


const ImageSender = ({ onImageSend }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        onImageSend(imageFiles);
      }
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleImageClick}
        className="text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
      >
        <ImagePlus className="h-5 w-5" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
};

export default ImageSender;
