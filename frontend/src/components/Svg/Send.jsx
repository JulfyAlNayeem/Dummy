import React from "react";
import { emojiColor } from "../../constant";
import { useUser } from "@/redux/slices/authSlice";

function Send({ themeIndex } ) {
    const fillColor = emojiColor[themeIndex]
  return (
    <div className={`icon heart  center w-6 h-[26px]`} style={{ "--fill-color": fillColor }}>
        <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    version="1.1"
    viewBox="0 0 297.303 227.117"
    xmlSpace="preserve"
  >
    <path fill="#fff" d="M297.303 0L.002 102.303l90.562 18.065z"></path>
    <path fill="#ffd95e" opacity="0.4" d="M0 102.303l90.56 18.065 60.104-34.994z"></path>
    <path fill="#ecf0f1" opacity="0.4"  d="M90.562 120.366l14.028 106.75L297.301 0z"></path>
    <path
      fill="#edb937" opacity="0.4"
      d="M90.562 120.366l14.03 106.75 86.132-101.508-14.867-24.227-29.459 24.591 4.269-40.598h-.002l-60.104 34.994h.002v-.002z"
    ></path>
    <path fill="#fece0e" opacity="0.4"  d="M297.303 0l-174.22 145.436-18.492 81.681z"></path>
    <path
      fill="#fad24d"  opacity="0.4"
      d="M146.397 125.971l-23.316 19.464-18.492 81.681 86.132-101.508-14.867-24.227-29.459 24.591v-.002z"
    ></path>
    <path fill="#fff"  opacity="0.6" d="M238.037 202.713L297.301 0l-174.22 145.436z"></path>
    <path
      fill="#ffd95e" opacity="0.4"
      d="M146.267 125.971l-23.316 19.464 114.958 57.278-62.183-101.331-29.456 24.591v-.002z"
    ></path>
  </svg>
    </div>
  );
}

export default Send;