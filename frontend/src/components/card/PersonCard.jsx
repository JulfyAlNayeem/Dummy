import React from "react";
import avtwo from "../../assets/avatar/avtwo.svg";
import { cardClass, iconColor, navbarIconColor } from "../../constant";
import { useUser } from "@/redux/slices/authSlice";
export default function PersonCard({ img, userInfo, message }) {
  const { themeIndex } = useUser();
  return (
    <section
      className={`${
        cardClass[themeIndex]
      } p-2 between my-2 cursor-pointer rounded-md`}
    >
      <div className="flex items-center gap-2">
      <div className=" bg-slate-400 rounded-md p-1 w-fit">
        <img src={avtwo} className=" size-10" alt="" />
      </div>
      <div className={`${navbarIconColor[themeIndex]}
 w-fit`}>
        <p className="  font-bold">{userInfo.name}</p>
        <p className=" text-sm ">Marhaban!</p>
      </div>
      </div>
      <div className=" h-full space-y-2">
        <p className=" text-gray-500 text-xs">4m</p>
        <p className="bg-orange-600 rounded-full size-4 text-xs center text-white">
          1
        </p>
      </div>
    </section>
  );
}
