import React from "react";
import { useUser } from "@/redux/slices/authSlice";
import { emojiColor } from "../../constant";

function Icon({ themeIndex, open }) {
  // const { themeIndex } = useUser();
  const fillColor = emojiColor[themeIndex]

  return (
    <div className={`icon book`} style={{ "--fill-color": fillColor }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        version="1.1"
        viewBox="0 0 24 24">
        <path
          fill="#292D32"
          d="M12 5.3v16.03c-.17 0-.35-.03-.49-.11l-.04-.02c-1.92-1.05-5.27-2.15-7.44-2.44l-.29-.04C2.78 18.6 2 17.7 2 16.74V4.66c0-1.19.97-2.09 2.16-1.99 2.1.17 5.28 1.23 7.06 2.34l.25.15c.15.09.34.14.53.14z"
          opacity="0.4"></path>
        <path
          fill="#292D32"
          d="M22 4.67v12.07c0 .96-.78 1.86-1.74 1.98l-.33.04c-2.18.29-5.54 1.4-7.46 2.46-.13.08-.29.11-.47.11V5.3c.19 0 .38-.05.53-.14l.17-.11c1.78-1.12 4.97-2.19 7.07-2.37h.06c1.19-.1 2.17.79 2.17 1.99z"
        ></path>
        <path
          fill="#292d32"
          strokeWidth="0.418"
          d="M7.843 8.363H6.209c-.297 0-.544-.082-.544-.18 0-.1.247-.182.544-.182h1.634c.297 0 .544.082.544.181 0 .099-.247.181-.544.181z"
        ></path>
        <path
          fill="#292d32"
          strokeWidth="0.436"
          d="M8.387 12.438H6.21c-.297 0-.544-.089-.544-.196 0-.108.247-.197.544-.197h2.178c.298 0 .545.09.545.197 0 .107-.247.196-.545.196z"
        ></path>
      </svg>
    </div>
  );
}

export default Icon;