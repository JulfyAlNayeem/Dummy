import React, { useState } from "react";
import avtwo from "../../assets/avatar/avthree.svg";
import { cardClass } from "../../constant";
import { useUser } from "@/redux/slices/authSlice";
export default function PersonRequest({ img, name, message }) {
  // Removed useChatContext usage
  const [accept, setAccept] = useState(false);
  const [reject, setReject] = useState(false);
  return (
    <main
      className={`${cardClass[themeIndex]} p-2 flex items-center gap-3  cursor-pointer rounded-md`}
    >
      <section className=" bg-slate-400 rounded-md p-1 w-fit">
        <img src={avtwo} className=" size-10" alt="" />
      </section>
      <section className=" w-[70%]">
        <p className=" text-gray-400 font-bold">Abdullah</p>
        <div className="start gap-4">
          <button
            className=" bg-red-600 rounded-md text-sm px-2 py-1 font-semibold text-white"
            style={{ background: "red" }}
            onClick={() => setReject(true)}
          >
            Reject
          </button>

          <button
            className=" bg-red-600 rounded-md text-sm px-2 py-1 font-semibold text-white"
            style={{ background: "green" }}
            onClick={() => setAccept(true)}
          >
            Accept
          </button>
        </div>
      </section>
    </main>
  );
}
