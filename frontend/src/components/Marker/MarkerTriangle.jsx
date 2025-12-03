import React from 'react'
import { chatListFooterBorderColor, chatListFooterColor } from '@/constant'
import { useUser } from '@/redux/slices/authSlice';

export default function MarkerTriangle({themeIndex}) {
    // const { themeIndex } = useUser();

    return (
        // <div className="relative w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-t-[100px] border-t-transparent border border-transparent">
        //     <div className="absolute border-black bottom-[35px] left-[-50px] w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-t-[70px] border-t-brown-500">

        <div className="">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="68"
                height="65"
                version="1.1"
                viewBox="-1 0 58 50.83"
            >
                <g transform="translate(-44.695 -75.714)">
                    <path
                        fill={`${chatListFooterColor[themeIndex]}`}
                        stroke={`${chatListFooterBorderColor[themeIndex]}`}
                        strokeWidth="5"
                        d="M65.792 121.066l-2.425-4.2-16.032-27.768a7.856 7.856 120 016.804-11.784H91.052a7.856 7.856 60 016.803 11.784l-2.425 4.2L79.4 121.066a7.856 7.856 0 01-13.607 0z"
                    ></path>
                </g>
            </svg>
        </div>

        //     </div>
        // </div>
    )
}
