import { useState } from "react";
import { motion } from "framer-motion";

const messagePath = `m 199.63333,146.02318 c -8.04354,0 -14.51758,6.47599 -14.51758,14.51953 v 52.26758 c 0,8.04354 6.47404,14.51953 14.51758,14.51953 h 7.75976 l -7.30238,25.8005 a 0.12205854,0.12205854 35.248419 0 0 0.18798,0.13285 L 236.897,227.32982 h 6.14404 c 3.55668,0 5.30788,-2.67758 4.54707,-6.14778 -1.24052,-5.65817 -1.20639,-11.5501 0.13506,-17.24089 4.01929,-16.77302 18.61193,-28.89075 35.83789,-29.75977 3.70171,-0.18714 7.41115,0.15618 11.01563,1.01953 2.80482,0.67359 5.52074,1.65607 8.09902,2.92612 2.51585,1.23931 4.39902,0.26163 4.39902,-2.5449 v -15.03942 c 0,-8.04354 -6.47598,-14.51953 -14.51953,-14.51953 z`;

const thunderPath = `m 308.69114,215.06862 c -4.67902,2.9227 -9.08037,5.66815 -11.58789,7.20508 -0.24461,0.14993 -0.36766,0.22218 -0.58008,0.35156 l -12.24609,18.57813 a 7.7102067,7.7102067 0 0 0 2.19531,10.68164 6.8733908,6.8733908 0 0 0 9.18555,-3.17969 l 12.78125,-19.39258 c 2.97077,-4.50735 2.68754,-10.18513 0.25195,-14.24414 z`;

export default function QuickMessageIcon() {
  const [active, setActive] = useState(false);

  return (
    <button onClick={() => setActive(!active)} className="w-16 h-16">
      <svg
        viewBox="180 140 160 100"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Chat Bubble */}
        <motion.path
          d={messagePath}
          fill={active ? "#0F172A" : "none"}
          stroke="#0F172A"
          strokeWidth="2"
          initial={false}
          animate={{ fill: active ? "#0F172A" : "none" }}
          transition={{ duration: 0.3 }}
        />

        {/* Horizontal Lines */}
        <motion.line
          x1="210"
          y1="170"
          x2={active ? 280 : 220}
          y2="170"
          stroke="#FACC15"
          strokeWidth="3"
          transition={{ duration: 0.4 }}
        />
        <motion.line
          x1="210"
          y1="180"
          x2={active ? 270 : 215}
          y2="180"
          stroke="#FACC15"
          strokeWidth="3"
          transition={{ duration: 0.4, delay: 0.1 }}
        />

        {/* Thunderbolt */}
        <motion.path
          d={thunderPath}
          fill="none"
          stroke="#FACC15"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: active ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
        />
      </svg>
    </button>
  );
}
