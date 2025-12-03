import React, { useState, useEffect, useCallback } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useGetImageMessagesQuery } from '@/redux/api/messageApi';
import { BASE_URL } from '@/utils/baseUrls';

const ImagePreviewModal = ({ previewImage, setPreviewImage, conversationId, user }) => {
  const [imageCursor, setImageCursor] = useState(null);
  const [imageSkip, setImageSkip] = useState(0);
  const [useSkipLimit, setUseSkipLimit] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasMoreImages, setHasMoreImages] = useState(true);
  const [direction, setDirection] = useState('older');

  // Fetch images using RTK Query
  const { data: imageData, isLoading: isImageDataLoading, isFetching: isImageDataFetching, refetch } = useGetImageMessagesQuery(
    {
      conversationId,
      cursor: imageCursor,
      limit: 20,
      direction,
      skip: useSkipLimit ? imageSkip : undefined,
    },
    { skip: !conversationId }
  );

  // Initialize previewImages with the initial previewImage
  useEffect(() => {
    if (previewImage && previewImages.length === 0) {
      setPreviewImages([{ _id: 'initial', media: [{ url: previewImage.replace(`${BASE_URL}uploads/`, ''), type: 'image' }], createdAt: new Date() }]);
    }
  }, [previewImage, previewImages.length]);

  // Update previewImages when imageData changes
  useEffect(() => {
    if (imageData?.images?.length > 0) {
      setPreviewImages((prev) => {
        const newImages = imageData.images.filter(
          (img) => !prev.some((existing) => existing._id === img._id)
        );
        return direction === 'older' ? [...newImages, ...prev] : [...prev, ...newImages];
      });
      setImageCursor(imageData.nextCursor);
      setHasMoreImages(imageData.hasMore);
    }
  }, [imageData, direction]);

  // Image navigation handlers
  const handleNextImage = useCallback((e) => {
    e.stopPropagation();
    if (currentImageIndex < previewImages.length - 1) {
      // Move to the next older image
      setCurrentImageIndex((prev) => prev + 1);
      setPreviewImage(`${BASE_URL}uploads/${previewImages[currentImageIndex + 1].media[0].url}`);
      setDirection('older');
    } else if (hasMoreImages) {
      // Fetch more older images
      setDirection('older');
      setImageCursor(previewImages[previewImages.length - 1]?.createdAt?.getTime?.() || imageCursor);
      refetch();
    }
  }, [currentImageIndex, previewImages, hasMoreImages, imageCursor, refetch, setPreviewImage]);

  const handlePreviousImage = useCallback((e) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
      // Move to the previous newer image
      setCurrentImageIndex((prev) => prev - 1);
      setPreviewImage(`${BASE_URL}uploads/${previewImages[currentImageIndex - 1].media[0].url}`);
      setDirection('newer');
    } else if (hasMoreImages) {
      // Fetch more newer images
      setDirection('newer');
      setImageCursor(previewImages[0]?.createdAt?.getTime?.() || imageCursor);
      refetch();
    }
  }, [currentImageIndex, previewImages, hasMoreImages, imageCursor, refetch, setPreviewImage]);

  if (!previewImage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" style={{ contain: 'strict' }} onClick={() => setPreviewImage(null)}>
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Close button */}
        <button
          onClick={() => setPreviewImage(null)}
          className="absolute top-2 right-2 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700 z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous button */}
        <button
          onClick={handlePreviousImage}
          className="absolute left-4 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700 z-10"
          disabled={isImageDataLoading || isImageDataFetching}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative">
          {(isImageDataLoading || isImageDataFetching) && (
            <div className="absolute inset-0 flex items-center justify-center mx-auto">
              <LoaderCircle className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          <img
            src={previewImage}
            alt="Image preview"
            className="max-w-[90vw] max-h-[90vh] object-contain overflow-hidden rounded-lg"
          />
        </div>

        {/* Next button */}
        <button
          onClick={handleNextImage}
          className="absolute right-4 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700 z-10"
          disabled={isImageDataLoading || isImageDataFetching}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ImagePreviewModal;