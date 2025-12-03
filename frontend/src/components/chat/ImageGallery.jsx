
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';



const ImageGallery = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Image */}
      <div className="max-w-4xl max-h-[90vh] p-4">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
