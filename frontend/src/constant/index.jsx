import arabic from "../assets/background/arabicDark.svg";
import rhino from "../assets/background/rahino.svg";
import miniRhino from "../assets/background/minirahino.svg";
import miniarabic from "../assets/background/arabicDarkmini.svg";
import elephant from "../assets/background/Elephant.svg";
import minielephant from "../assets/background/elephantmini.svg";
import blue from "../assets/background/blue.svg";
import orangeSmall from "../assets/background/orangeSmall.webp";
import blueSmall from "../assets/background/blueSmall.svg";
import orange from "../assets/background/orange.svg";
import sunset from "../assets/background/sunset.svg";
import minisunset from "../assets/background/sunsetmini.svg";
import bridge from "../assets/background/bridge.svg";
import rocket from "../assets/background/curve-rocket.webp"; 
import smallRocket from "../assets/background/rocketsmall.webp";
import minibridge from "../assets/background/bridgemini.svg";
import mangroovmini from "../assets/background/mangroovmini.webp";
import mangroov from "../assets/background/mangroov.svg";
import magicaldeer from "../assets/background/magicalDeer.svg";
import magicaldeersmall from "../assets/background/magicalDeerSmall.webp";
import caveCityTwilight from "../assets/background/caveCityTwilight.svg";
import caveCityTwilightSmall from "../assets/background/caveCityTwilightSmall.webp";

// import caveCity from "../assets/background/cavecity.svg";

import forestDeer from "../assets/background/forestDeer.svg";
import forestDeerSmall from "../assets/background/forestDeerSmall.webp";

import wolfSnow from "../assets/background/wolfSnow.svg";
import wolfSnowSmall from "../assets/background/wolfSnowSmall.webp";

import astronautMoon from "../assets/background/astronautMoon.svg";
import astronautMoonSmall from "../assets/background/astronautMoonSmall.webp";
import Gumbuj from "@/components/Marker/Dome";
import MarkerTriangle from "@/components/Marker/MarkerTriangle";
import Wolf from "@/components/Marker/Wolf";
import ArabicDarkMosque from "@/components/Svg/ArabicDarkMosque";
import DeerHorn from "@/components/Marker/DeerHorn";
import Circle from "@/components/Marker/Circle";
import ElephantHead from "@/components/Marker/ElephantHead";

export const defaultProfileImage = "/images/avatar/default-avatar.svg";
export const defaultCoverImage = "/images/cover/default-cover.jpg";


export const theme = [
  "bg-slate-950   ",
  "bg-[#b26f01]",
  "bg-lightPink",
  "bg-[#bcc363] b",
  "bg-[#6981d6]",
  "bg-[#041033] text-white shadow-teal-700",
  "bg-slate-950 shadow-blue-950",
  "bg-[#2d2f7fff]/20   ", // Sunset Reflection
  "bg-[#0a0f24ff]", // Magical Deer
  "bg-[#c64a00]/50", // Cave City
  "bg-[]", // Forest Deer (light green)
  "bg-[#b7dde4]/20", // Wolf in Snow (light blue)
  "bg-[#1a1a1a]" // Astronaut with Moon (golden)
];

export const navbarTheme = [
  "bg-slate-950/10    ",
  "bg-[]",
  "bg-lightPink",
  "bg-[#bcc363]/50",
  "bg-[#6981d6]",
  "bg-[#41b0d3]/80",
  "bg-[#03426f]/40", // Firefly
  "bg-[#2d2f7fff]/20   ", // Sunset Reflection
  "bg-[#0a0f24ff]", // Magical Deer
  "bg-[#c64a00]/50", // Cave City
  "bg-[]", // Forest Deer (light green)
  "bg-[#b7dde4]/20", // Wolf in Snow (light blue)
  "bg-[themeBgColor]" // Astronaut with Moon (golden)
];



export const iconColor = [
  "text-blue-400 border-blue-400",
  "text-brown border-brown",
  "text-lightChocolate border-lightChocolate border-hidden",
  "text-parrot border-parrot",
  "text-deepSlate border-deepSlate",
  "text-[#132757] border-[#132757] border-hidden", // Rocket
  "text-[#8e4c95] border-[#8e4c95]", // Sunset Reflection
  "text-[#60a5fa] border-[#60a5fa]", // Magical Deer
  "text-[#c75400] border-[#c75400]", // Cave City 2
  "text-[#597d2d] border-[#597d2d]", // Forest Deer
  "text-[#4682b4] border-[#4682b4]", // Wolf in Snow
  "text-[#daa520] border-transparent" // Astronaut with Moon
];

export const chatInputBg = [
  "bg-slate-950 text-blue-400 backdrop-blur-sm backdrop-opacity-80 placeholder:text-blue-400",
  "bg-[#291702] backdrop-blur-sm backdrop-opacity-80 placeholder:text-brown",
  "bg-[#fabf78] text-lightChocolate placeholder:text-brown placeholder:text-white",
  "bg-[#8dcc90] placeholder:text-white text-white",
  "bg-[#15214dff] backdrop-blur-lg backdrop-opacity-10 placeholder:text-deepSlate",
  "bg-[#0a81b2] text-[#e0f5ff] placeholder:text-[#4FD1C5]",
  "bg-[#404b0f]/60 backdrop-blur-lg backdrop-opacity-10 placeholder:text-[#c4a91e]",
  "bg-[#2A1F4D] text-[#8e4c95] backdrop-blur-sm backdrop-opacity-80 placeholder:text-[#8e4c95]", // Sunset Reflection
  "bg-[#0a0f24ff] text-[#60a5fa] backdrop-blur-sm backdrop-opacity-80 placeholder:text-[#60a5fa]", // Magical Deer
  "bg-[#9b4100] text-[#c75400] backdrop-blur-sm backdrop-opacity-80 placeholder:text-white", // Cave City
  "bg-[#597d2d] text-green-100 backdrop-blur-sm backdrop-opacity-80 placeholder:text-green-100", // Forest Deer
  "bg-[#b7dde4] text-[#4682b4] backdrop-blur-sm backdrop-opacity-80 placeholder:text-[#4682b4]", // Wolf in Snow
  "bg-[#573d16] text-[#daa520] backdrop-blur-sm backdrop-opacity-80 placeholder:text-[#daa520]" // Astronaut with Moon
];

export const navbarIconColor = [
  "text-blue-400 border-blue-400 placeholder:text-blue-400",
  "text-brown border-brown placeholder:text-brown",
  "text-lightChocolate border-brown placeholder:text-brown",
  "text-parrot border-parrot",
  "text-[#274490ff] border-deepSlate placeholder:text-deepSlate",
  "text-[#e0f5ff] border-[#e0f5ff] placeholder:text-[#4FD1C5]",
  "text-[#369eba] border-[#404b0f] placeholder:text-[#404b0f] border-hidden", // Firefly
  "text-[#8e4c95] border-[#8e4c95] placeholder:text-[#8e4c95]", // Sunset Reflection
  "text-[#60a5fa] border-[#60a5fa] placeholder:text-[#60a5fa]", // Magical Deer
  "text-[#c75400]  placeholder:text-[#c75400]", // Cave City
  "text-[#597d2d] border-[#597d2d] placeholder:text-[#597d2d]", // Forest Deer
  "text-[#4682b4] border-[#4682b4] placeholder:text-[#4682b4]", // Wolf in Snow
  "text-[#daa520] border-[#daa520] placeholder:text-[#daa520]" // Astronaut with Moon
];

export const borderColor = [
  "text-blue-400 border-blue-400",
  "text-brown border-brown",
  "text-lightChocolate border-lightChocolate border-hidden",
  "text-parrot border-parrot",
  "text-[#788fc2] border-deepSlate",
  "text-[#e0f5ff] border-[#e0f5ff]",
  "text-[#887409] border-[#404b0f] border-hidden",
  "text-purple-300 border-[#8e4c95]", // Sunset Reflection
  "text-[#60a5fa] border-[#60a5fa]", // Magical Deer
  "text-white border-transparent", // Cave City
  "text-[#597d2d] border-transparent", // Forest Deer
  "text-[#4682b4]   border-transparent  border-[#4682b4]", // Wolf in Snow
  "text-[#daa520] border-transparent" // Astronaut with Moon
];

export const footerIconColor = [
  "text-blue-400 border-blue-400",
  "text-brown border-brown",
  "text-lightChocolate border-lightChocolate border-hidden",
  "text-parrot border-parrot",
  "text-deepSlate border-deepSlate",
  "text-[#e0f5ff] border-[#e0f5ff]",
  "text-[#404b0f] border-[#404b0f] border-hidden",
  "text-[#8e4c95] border-[#8e4c95]", // Sunset Reflection
  "text-[#60a5fa] border-[#60a5fa]", // Magical Deer
  "text-[#c45200] border-transparent", // Cave City
  "text-[#597d2d] border-transparent", // Forest Deer
  "text-[#4682b4]   border-transparent  border-[#4682b4]", // Wolf in Snow
  "text-[#daa520] border-transparent" // Astronaut with Moon
];

export const searchBox = [
  "text-blue-400 border-blue-400",
  "text-brown border-brown",
  "bg-[#e08f60] border-hidden",
  "bg-parrot",
  "text-[#5771b3] border-[#5771b3]",
  "text-[#e0f5ff] bg-[#041033]/10 border-hidden",
  "text-[#404b0f] bg-[#404b0f]/20 border-none",
  "text-[#8e4c95] bg-[#2A1F4D]/20 border-[#8e4c95]", // Sunset Reflection
  "text-[#60a5fa] bg-[#0a0f24ff]/20 border-[#60a5fa]", // Magical Deer
  "text-[#c75400] bg-[#f4a261]/20 border-[#c75400]", // Cave City
  "text-[#597d2d] bg-[#355735]/20 border-[#597d2d]", // Forest Deer
  "text-[#4682b4] bg-[#b7dde4]/20 border-[#4682b4]", // Wolf in Snow
  "text-[#daa520] bg-[#573d16]/20 border-[#daa520]" // Astronaut with Moon
];

export const emojiColor = [
  "#5fa5fa",
  "#854e00ff",
  "#663039",
  "#8dcc90",
  "#274490",
  "#e0f5ff",
  "#404b0f",
  "#8e4c95", // Sunset Reflection
  "#60a5fa", // Magical Deer
  "#c75400", // Cave City
  "#597d2d", // Forest Deer
  "#6196bf", // Wolf in Snow
  "#daa520" // Astronaut with Moon
];

export const secondColor = [
  "#80b7fbff",
  "#291702",
  "#663039",
  "#8dcc90",
  "#274490",
  "#027bb3",
  "#404b0f",
  "#1E1E4B", // Sunset Reflection
  "#1E1E4B", // Magical Deer
  "#f4a261", // Cave City
  "#356a39", // Forest Deer
  "#274490", // Wolf in Snow
  "#573d16" // Astronaut with Moon
];

export const chatListFooterColor = [
  "#0f1729",
  "#533004ff",
  "#8dcc90",
  "#8dcc90",
  "#041033",
  "#0b8cbb",
  "#131d34ff",
  "#2A1F4D", // Sunset Reflection
  "#0a0f24ff", // Magical Deer
  "#f4a261", // Cave City
  "#356a39", // Forest Deer
  "#b7dde4", // Wolf in Snow
  "#573d16" // Astronaut with Moon
];

export const chatListFooterBorderColor = [
  "#020617",
  "#291702",
  "#111e40ff #8dcc90]",
  "#8dcc90 #8dcc90",
  "#041033",
  "#111e40ff",
  "border-[#111e40ff] bg-[#131d34ff]",
  "#1E1E4B", // Sunset Reflection
  "#0a0f24ff", // Magical Deer
  "#f4a261", // Cave City
  "#a3e4d7", // Forest Deer
  "#b7dde4", // Wolf in Snow
  "#573d16" // Astronaut with Moon
];

export const footerBg = [
  "bg-slate-800/30",
  "bg-[#291702]/80",
  "bg-lightPink",
  "bg-lightYellow/40",
  "bg-[#111c3d]/70",
  "bg-[#0b8cbb]/70", // Rocket
  "bg-[#173b1d]/30 backdrop-blur-sm ",
  "bg-[#2A1F4D]/70 ", // Sunset Reflection
  "bg-[#0a0f24ff]/70", // Magical Deer
  "bg-[#c14f00]/30", // Cave City
  "bg-transparent", // Forest Deer
  "bg-transparent", // Wolf in Snow
  "bg-[#1a1a1a]/70" // Astronaut with Moon
];

export const chatOptionBg = [
  "bg-slate-800/50",
  "bg-[#291702]/60",
  "bg-lightYellow",
  "bg-lightYellow/40",
  "bg-[#111c3d]/30",
  "bg-[#0a81b2]/50", // rocket theme
  "bg-[#0a0f24ff]/50", // Magical Deer
  "bg-[#f4a261]/50",// Wolf in Snow
  "bg-[#a3e4d7]/50", // Forest Deer
  "bg-[#b44400]/50",  // Cave City
  "bg-[#573d16]/50" // Astronaut with Moon
];

export const sidebarBg = [
  "bg-slate-800",
  "bg-[#291702]/60",
  "bg-lightYellow",
  "bg-lightYellow/40",
  "bg-[#111c3d]/90",
  "bg-[#041033]/80", // rocket theme
  "bg-[#0a0f24ff]/80", // Magical Deer
  "bg-[#f4a261]/80", // Cave City
  "bg-[#a3e4d7]/80", // Forest Deer
  "bg-[#b7dde4]/80", // Wolf in Snow
  "bg-[#573d16]/80" // Astronaut with Moon
];

export const cardClass = [
  "text-gray-200 bg-slate-900/80",
  "text-gray-200 bg-brown/50",
  "bg-gradient-to-r from-[#db8963] via-#ffd787] to-[#faa850] text-white",
  "bg-gradient-to-r from-[#8ecd91] to-[#bcc363]  text-white  shadow-md text-white",
  "text-blue-200 bg-[#7f94dcff]/60",
  "text-white bg-[#3492b4]/80",  // Rocket
  "text-blue-200 bg-[#404b0f]/60",
  "text-white bg-gradient-to-r from-[#8e4c95] to-[#2A1F4D] shadow-md", // Sunset Reflection
  "text-white bg-[#0a0f24ff] shadow-md", // Magical Deer
  " text-[#4a1200] bg-[#c85400]/60 shadow-md", // Cave City
  "text-white bg-[#78a33d]/40 shadow-md", // Forest Deer
  "text-[#1d4373] bg-[#b7dde4]/20 shadow-md", // Wolf in Snow
  "text-white bg-[#573d16]/5 shadow-md" // Astronaut with Moon
];

export const themeBgColor = [
  "text-gray-200 bg-slate-900/80 shadow-[#4b75a5] backdrop-blur shadow-md",
  "text-gray-200 bg-brown/50  backdrop-blur",
  "bg-gradient-to-r from-[#db8963] via-#ffd787] to-[#faa850] text-white backdrop-blur",
  "bg-gradient-to-br from-[#f5ff82] via-[#d5e055] to-[#8dcc90] text-white backdrop-blur",
  "text-blue-200 bg-[#7f94dcff]/60 backdrop-blur",
  "text-white bg-[#041033]/80 shadow-teal-700",
  "text-blue-200 bg-[#404b0f]/60 backdrop-blur",
  "text-white bg-gradient-to-r from-[#8e4c95] to-[#2A1F4D] ", // Sunset Reflection
  "text-white bg-[#0a0f24ff]/20 shadow-[#004f95] shadow-lg backdrop-blur-lg", // Magical Deer
  "text-white bg-gradient-to-b from-[#f4a261] to-[#c75400] shadow-md", // Cave City
  "text-white bg-[#a3e4d7] shadow-md backdrop-blur", // Forest Deer
  "text-white bg-[#b7dde4] shadow-md backdrop-blur", // Wolf in Snow
  "text-white bg-[#573d16] shadow-md backdrop-blur" // Astronaut with Moon
];

export const messageSenderCard = [
  "text-gray-200 bg-slate-700/50",
  "text-gray-200 bg-brown/50",
  "text-white bg-gradient-to-r from-[#db8963] via-#ffd787] to-[#faa850]",
  "text-white bg-gradient-to-r from-[#8dcc90] to-[#d5e055] shadow-md",
  "text-blue-200 bg-[#7f94dcff]/80",
  "text-blue-200 bg-slate-800/70",
  "text-blue-200 bg-[#404b0f]/60",
  "text-white bg-[#2A1F4D]/70", // Sunset Reflection
  "text-white bg-[#0a0f24ff]/70", // Magical Deer
  "text-white bg-[#f4a261]/70", // Cave City
  "text-white bg-[#a3e4d7]/70", // Forest Deer
  "text-white bg-[#b7dde4]/70", // Wolf in Snow
  "text-white bg-[#573d16]/70" // Astronaut with Moon
];

export const accordionSummaryOne = [
  "#121c30ff",
  "#311c02ff",
  "#f79065",
  "",
  "#182c5dff",
  "#121c30ff",
  "#121c30ff",
  "#1E1E4B", // Sunset Reflection
  "#0a0f24ff", // Magical Deer
  "#f4a261", // Cave City
  "#a3e4d7", // Forest Deer
  "#b7dde4", // Wolf in Snow
  "#67471aff" // Astronaut with Moon
];

export const accordionSummaryTwo = [
  "#152037ff",
  "#361f02ff",
  "#d98b56",
  "",
  "#1a3065ff",
  "#121c30ff",
  "#121c30ff",
  "#2A1F4D", // Sunset Reflection
  "#0a0f24ff", // Magical Deer
  "#f4a261", // Cave City
  "#a3e4d7", // Forest Deer
  "#b7dde4", // Wolf in Snow
  "#573d16" // Astronaut with Moon
];

export const accordionDetails = [
  "#18243fff",
  "#402502ff",
  "#c1755e",
  "",
  "#18243fff",
  "#18243fff",
  "#254692ff",
  "#1E1E4B", // Sunset Reflection
  "#0a0f24ff", // Magical Deer
  "#f4a261", // Cave City
  "#a3e4d7", // Forest Deer
  "#b7dde4", // Wolf in Snow
  "#402c10ff" // Astronaut with Moon
];

export const themeImg = [
  { theme: miniarabic, title: "Arabic Dark" },
  { theme: miniRhino, title: "Twilight in Wild" },
  { theme: minisunset, title: "Mountain Sunset" },
  { theme: minibridge, title: "Suspension Bridge" },
  { theme: minielephant, title: "Elephant In The Misty Fog" },
  { theme: rocket, title: "Let Them Test Of ..." },
  { theme: orangeSmall, title: "Let Them Know Of ..." },
  { theme: mangroov, title: "Sunset Reflection" }, // Sunset Reflection
  { theme: magicaldeer, title: "Magical Deer" }, // Magical Deer
  { theme: caveCityTwilightSmall, title: "Cave City In The Twilight" }, // Cave City
  { theme: forestDeerSmall, title: "Forest Deer" }, // Forest Deer
  { theme: wolfSnowSmall, title: "Wolf in Snow" }, // Wolf in Snow
  { theme: astronautMoon, title: "Astronaut with Moon" } // Astronaut with Moon
];

export const themeBg = [
  arabic,
  rhino,
  sunset,
  bridge,
  elephant,
  rocket,
  orange,
  mangroov,
  magicaldeer,
  caveCityTwilight,
  forestDeer,
  wolfSnow,
  astronautMoon
];
export const miniThemeBg = [
  miniarabic,
  miniRhino,
  minisunset,
  minibridge,
  minielephant,
  smallRocket,
  orangeSmall,
  mangroovmini,
  magicaldeersmall,
  caveCityTwilightSmall,
  forestDeerSmall,
  wolfSnowSmall,
  astronautMoonSmall];

export const emoji = [
  { name: "crazy", img: 'images/emoji/crazy.svg', text: ":crazy:", html: "😜" },
  { name: "innocent", img: 'images/emoji/innocent.svg', text: ":innocent:", html: "😇" },
  { name: "laugh", img: 'images/emoji/laugh.svg', text: ":laugh:", html: "😂" },
  { name: "love", img: 'images/emoji/love.svg', text: ":love:", html: "😍" },
  { name: "sad", img: 'images/emoji/sad.svg', text: ":sad:", html: "😢" },
  { name: "smile", img: 'images/emoji/smile.svg', text: ":smile:", html: "😊" },
  { name: "worst", img: 'images/emoji/worst.svg', text: ":worst:", html: "😣" },
  { name: "aback", img: 'images/emoji/abak.svg', text: ":aback:", html: "😲" },
  { name: "frown", img: 'images/emoji/frown.svg', text: ":frown:", html: "😣" },
  { name: "laugh2", img: 'images/emoji/laugh2.svg', text: ":laugh2:", html: "😆" },
  { name: "laugh3", img: 'images/emoji/laugh3.svg', text: ":laugh3:", html: "😅" },
];


export const marker = [
  <ArabicDarkMosque />,
  <MarkerTriangle />,
  <div></div >,
  <DeerHorn />,
  <ElephantHead />,
  <Circle />,
  <Circle />,
  <MarkerTriangle />,
  <MarkerTriangle />,
  <Gumbuj />,
  <DeerHorn />,
  <Wolf />,
]
export const markerShape = [
  "top-[-107%]",
  "top-[-45%]",
  "top-[-45%]",
  "top-[-45%]",
  "top-[-45%]",
  "top-[-45%]",
  "top-[-65%]",
  "top-[-45%]",
  "top-[-45%]",
  "top-[-83%] ",
  "top-[-45%]",
  "top-[-53%]",
  "top-[-37%]",
]
// bg-gradient-to-r from-cyan-500 to-blue-500
export const sheetColor = [
  "bg-slate-900 text-blue-400 shadow-md",
  "bg-[#291702] text-white  shadow-lg",
  "bg-gradient-to-t from-[#be7260]  to-[#fcac4a]  text-white shadow-md",
  "bg-gradient-to-t from-[#8ecd91]  to-[#bcc363]  text-white  shadow-md",
  "bg-[#111d3e] text-sky-100",
  "bg-[#111e40] text-white  shadow-md",
  "bg-gradient-to-t from-[#404b0f]  to-[#04546f]  text-white  shadow-md",
  "bg-gradient-to-tl from-[#2a0d40] to-[#f36765]  text-white shadow-md",
  "bg-slate-950 text-white shadow-md",
  "bg-gradient-to-t from-[#c55200]  to-[#f87200]  text-white shadow-md",
  "bg-[#79a43d] text-white  shadow-lg",
  "bg-[#051b3a] text-white  shadow-lg",
  "bg-[#1d1c1a] text-white  shadow-lg",

]

export const firstButton = [
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#dd]  text-white",
  "bg-[#ddc85300]  text-white",
  "bg-[#c85300]  text-white",


]


export const secondButton = [
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#270500]",
  "bg-[#f98904]  text-white",
  "bg-[#f98904]  text-white",
  "bg-[#f98904]  text-white",


]


export const senderMessageCard = [
  "bg-gradient-to-br from-[#030a24ff] to-[#040f38ff] text-white",    // Arabic Dark
  "bg-gradient-to-r from-orange-500 to-yellow-600 text-white", // জিরাফ ও সূর্যাস্ত
  "bg-gradient-to-r from-[#c0656d] to-[#ff9764] text-white", // Boat
  "bg-gradient-to-t from-[#a9b244] to-[#71a373] text-white",    //Suspention
  "bg-gradient-to-r from-indigo-500 to-[#4c68a9] text-blue-100", // হাতি ও বড় গাছ
  "bg-[#3492b5] text-white",  // rocket theme (navy -> teal)
  "bg-[#173b1d]/70 text-white", // Firefly
  "bg-gradient-to-r from-[#b54c8b] to-[#602b83] text-white",  // Sunset reflection
  "bg-gradient-to-r from-[#000f18] to-[#000e10] text-slate-200",   // Magical Deer
  "bg-gradient-to-r from-[#803000ff] to-[#c4810c] shadow text-white", // Cave City Twilight
  "bg-gradient-to-r from-[#597d2d] to-[#597d2d] text-green-100",   // Forest Deer
  "bg-gradient-to-r from-blue-400 to-silver-300 from-[#255487] to-[#598eb8] text-white",   // Snow wolf
  "bg-gradient-to-r from-yellow-900 to-[#292929ff] text-white",  // Astronat and moon
];

export const receiverMessageCard = [
  "bg-gradient-to-tl from-[#030a24ff] to-[#040f38ff] text-white",    // Arabic Dark
  "bg-gradient-to-r from-yellow-600 to-orange-500 text-white shadow", // জিরাফ ও সূর্যাস্ত
  "bg-gradient-to-tl from-[#faa851] to-[#ff9764] text-white", // বন ও নৌকা ও পাহাড়
  "bg-gradient-to-t from-[#a9b244] to-[#71a373] text-white",    //Suspention
  "bg-gradient-to-r from-[#4c68a9] to-indigo-500 text-blue-100", // হাতি ও বড় গাছ
  "bg-[#0a88b6]  text-white",  // rocket theme (navy -> teal)

  "bg-[#03426f]/70 text-white", // শহরের দৃশ্য
  "bg-gradient-to-l from-[#da5b78] to-purple-500 text-white", // Sunset reflection


  "bg-gradient-to-r from-[#000f18] to-[#000e10] text-slate-200",   // Magical Deer
  "bg-gradient-to-r from-[#c46d00] to-[#803000ff] text-white", // cave city twilight
  "bg-gradient-to-r from-[#597d2d] to-[#597d2d] text-green-100",   // Forest Deer
  "bg-gradient-to-r from-blue-400 to-silver-300 from-[#255487] to-[#598eb8] text-white",   // Snow wolf
  "bg-gradient-to-r from-yellow-900 to-[#292929ff] text-white",  // Astronat and moon
];
//     // হরিণ ও পাহাড়
