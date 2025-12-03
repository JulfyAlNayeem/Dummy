import React from "react";
import { useUser } from "@/redux/slices/authSlice";
import { emojiColor } from "../../constant";

function Grid({themeIndex, bottomContentIndex}) {
  // const {themeIndex } = useUser();
  const fillColor = emojiColor[themeIndex]

  return (
   <div className={`icon ${bottomContentIndex === 1? "heart": themeIndex === 10? "heart":null}`} style={{ "--fill-color": fillColor }}>
     <svg
      xmlns="http://www.w3.org/2000/svg"
       width="26"
        height="26"
       viewBox="-3 -4 37.909 38.214"
    >
      <g fill="none" fillRule="evenodd" stroke="none" strokeWidth="1">
        <g fill={fillColor} transform="translate(-104 -935)">
          <path d="M128 935h-4a4 4 0 00-4 4v4a4 4 0 004 4h4a4 4 0 004-4v-4a4 4 0 00-4-4zm0 16h-4a4 4 0 00-4 4v4a4 4 0 004 4h4a4 4 0 004-4v-4a4 4 0 00-4-4zm-16 0h-4a4 4 0 00-4 4v4a4 4 0 004 4h4a4 4 0 004-4v-4a4 4 0 00-4-4zm0-16h-4a4 4 0 00-4 4v4a4 4 0 004 4h4a4 4 0 004-4v-4a4 4 0 00-4-4z"></path>
        </g>
      </g>
    </svg>
   </div>
  );
}

export default Grid;