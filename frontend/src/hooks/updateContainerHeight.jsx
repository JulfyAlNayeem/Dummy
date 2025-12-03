import { useState, useEffect, useCallback } from 'react';

const useDynamicHeight = (fixedElementsHeight = 120) => {
  const [containerHeight, setContainerHeight] = useState('100vh'); // Initial fallback height

  const updateContainerHeight = useCallback(() => {
    const windowHeight = window.innerHeight; // Excludes system navigation bar and adjusts for keyboard
    const availableHeight = windowHeight - fixedElementsHeight; // Subtract fixed header + footer height
    setContainerHeight(`${availableHeight}px`);
  }, [fixedElementsHeight]);

  useEffect(() => {
    updateContainerHeight(); // Initial calculation
    window.addEventListener('resize', updateContainerHeight);
    window.addEventListener('orientationchange', updateContainerHeight);

    return () => {
      window.removeEventListener('resize', updateContainerHeight);
      window.removeEventListener('orientationchange', updateContainerHeight);
    };
  }, [updateContainerHeight]);

  return containerHeight;
};

export default useDynamicHeight;