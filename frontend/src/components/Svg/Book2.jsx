import * as React from "react";
import { useState } from "react";

const Book2 = () => {
const [animate, setAnimate] = useState(false);
  const handleClick = () => {
    setAnimate(false); // Reset animation
    setTimeout(() => setAnimate(true), 2); // Restart animation
  }
  return (
 <div className="">
         <button onClick={handleClick}>Animate Icon</button>

  <svg
    className={`svg-icon ${animate ? 'animate-path' : ''}`}
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      className="path-1"
      d="M514.38 888.46c-7.47 0-14.94-2.23-21.37-6.68l-50.65-35.12c-19.23-13.33-41.77-20.38-65.13-20.38H221.54C133.58 826.28 62 754.7 62 666.74V334.71c0-20.71 16.79-37.5 37.5-37.5S137 314 137 334.71v332.03c0 46.62 37.92 84.54 84.54 84.54h155.69c38.71 0 76.01 11.66 107.87 33.75l29.32 20.32 26.28-18.15c31.79-21.94 68.98-33.53 107.57-33.53h154.17c46.62 0 84.56-37.94 84.56-84.56v-334.4c0-20.71 16.79-37.5 37.5-37.5S962 314 962 334.71v334.41c0 87.98-71.58 159.56-159.56 159.56H648.27c-23.31 0-45.78 6.99-64.97 20.23l-47.61 32.9a37.348 37.348 0 0 1-21.31 6.65z"
    />
    <path
      className="path-2"
      d="M791.19 135.54H571.06c-30.37 0-55.12 24-56.63 54.38-1.12-30.37-25.88-54.38-56.25-54.38H238.06c-31.5 0-56.63 25.12-56.63 56.63v454.5c0 31.5 25.13 56.63 56.63 56.63h553.12c31.5 0 56.63-25.12 56.63-56.63v-454.5c0-31.51-25.12-56.63-56.62-56.63z"
    />
    <rect
      className="bar-1"
      x="266.56"
      y="345.55"
      width="163.12"
      height="28.12"
    />
    <rect
      className="bar-2"
      x="266.56"
      y="284.04"
      width="163.12"
      height="28.12"
    />
    <circle
      className="circle"
      cx="709.31"
      cy="628.67"
      r="58.13"
    />
  </svg>
 </div>
);

};

export default Book2;