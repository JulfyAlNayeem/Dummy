import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react'; // Assuming lucide-react for LoaderCircle

const CircleCluster = ({ themeImg, themeIndex, handleThemeChange }) => {
  const containerSize = 300; // Size to accommodate 13 images
  const centerSize = 120; // Central image size
  const innerSize = 80; // Inner ring image size
  const outerSize = 60; // Outer ring image size

  // Radii for different rings
  const innerRadius = (containerSize - innerSize) / 3;
  const outerRadius = (containerSize - outerSize) / 2;

  // Local state to track which image is loading
  const [loadingIndex, setLoadingIndex] = useState(null);

  // Modified handleThemeChange to manage local loading state
  const handleImageClick = (index) => {
    setLoadingIndex(index); // Set loading state for clicked image
    handleThemeChange(index); // Call the parent handler
    // Simulate async operation (e.g., image loading)
    // Remove this setTimeout in production and clear loading state when actual loading completes
    setTimeout(() => {
      setLoadingIndex(null); // Clear loading state after operation
    }, 1000); // Example delay of 1 second
  };

  return (
    <div
      style={{
        position: 'relative',
        width: containerSize,
        height: containerSize,
        margin: 'auto',
      }}
    >
      {/* Central image */}
      {themeImg[0] && (
        <div
          style={{
            position: 'absolute',
            width: centerSize,
            height: centerSize,
            top: (containerSize - centerSize) / 2,
            left: (containerSize - centerSize) / 2,
          }}
        >
          {loadingIndex === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCircle className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : (
            <img
              src={themeImg[0].theme}
              alt={themeImg[0].title}
              onClick={() => handleImageClick(0)}
              style={{
                width: centerSize,
                height: centerSize,
                borderRadius: '50%',
                border: themeIndex === 0 ? '4px solid #22c55e' : '4px solid transparent',
                objectFit: 'cover',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                transition: 'border-color 0.3s ease',
              }}
            />
          )}
        </div>
      )}

      {/* Inner ring (4 images) */}
      {[1, 2, 3, 4].map((i, idx) => {
        const angle = (idx / 4) * 2 * Math.PI;
        const x = containerSize / 2 + innerRadius * Math.cos(angle) - innerSize / 2;
        const y = containerSize / 2 + innerRadius * Math.sin(angle) - innerSize / 2;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: innerSize,
              height: innerSize,
              top: y,
              left: x,
            }}
          >
            {loadingIndex === i ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoaderCircle className="w-6 h-6 text-white animate-spin" />
              </div>
            ) : (
              <img
                src={themeImg[i]?.theme}
                alt={themeImg[i]?.title}
                onClick={() => handleImageClick(i)}
                style={{
                  width: innerSize,
                  height: innerSize,
                  borderRadius: '50%',
                  border: themeIndex === i ? '2px solid #22c55e' : '2px solid transparent',
                  objectFit: 'cover',
                  cursor: 'pointer',
                  boxShadow: '0 0 6px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.3s ease',
                }}
              />
            )}
          </div>
        );
      })}

      {/* Outer ring (8 images) */}
      {[5, 6, 7, 8, 9, 10, 11, 12].map((i, idx) => {
        const angle = (idx / 8) * 2 * Math.PI;
        const x = containerSize / 2 + outerRadius * Math.cos(angle) - outerSize / 2;
        const y = containerSize / 2 + outerRadius * Math.sin(angle) - outerSize / 2;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: outerSize,
              height: outerSize,
              top: y,
              left: x,
            }}
          >
            {loadingIndex === i ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoaderCircle className="w-5 h-5 text-white animate-spin" />
              </div>
            ) : (
              <img
                src={themeImg[i]?.theme}
                alt={themeImg[i]?.title}
                onClick={() => handleImageClick(i)}
                style={{
                  width: outerSize,
                  height: outerSize,
                  borderRadius: '50%',
                  border: themeIndex === i ? '2px solid #22c55e' : '2px solid transparent',
                  objectFit: 'cover',
                  cursor: 'pointer',
                  boxShadow: '0 0 6px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.3s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CircleCluster;