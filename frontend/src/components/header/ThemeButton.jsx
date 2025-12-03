import React, { useState, useRef } from "react";
import { MdColorLens } from "react-icons/md";
import { cardClass, iconColor, themeImg, navbarTheme, navbarIconColor } from "../../constant/index";
import { TiTick } from "react-icons/ti";
import { MdCancel } from "react-icons/md";
import { MdOutlineImagesearchRoller } from "react-icons/md";
import { MdImagesearchRoller } from "react-icons/md";
import  Drawer2 from "../drawer/Drawer";
import { Drawer } from "@mui/material";
import { useUser } from "@/redux/slices/authSlice";
export default function ThemeButton() {
  const [open, setOpen] = useState(false);
  const { themeIndex } = useUser();
  const style = {
    position: "absolute",
    top: "5%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
  };

  const overlayRef = useRef();
  const handleCloseNav = () => {
    if (overlayRef.current) {
      overlayRef.current.closeNav();
    }
    console.log('Bismillah')
  };

  const Item=  <div
  className={`${cardClass[themeIndex]
    } p-3 space-y-4 rounded-b-3xl overflow-y-scroll  `}
>
  <div className="between">
    <p className="text-sm font-serif font-base">Customize your chat</p>
    <MdCancel
      className=" cursor-pointer"
      onClick={ handleCloseNav }
    />
  </div>
  {themeImg.map((img, index) => (
    <div
      className="between cursor-pointer"
      onClick={() => {
        themeIndex.setValue(index), setOpen(false);

      }}
      key={index}
    >
      <div className="flex items-center gap-2">
        <button
          className={`${navbarTheme[index]} size-11 rounded-full  shadow-md shadow-gray-900 center `}
        >
          <img
            src={img.theme}
            className="size-11 rounded-full  mx-1 "
            alt="theme"
          />
        </button>
        <p className="text-sm">{img.title}</p>
      </div>
      {themeIndex === index ? <TiTick className="" /> : null}
    </div>
  ))}
</div>

  return (
    <>

      <Drawer2 ref={overlayRef}  children={Item}/>
      <button
        // onClick={}
        onClick={ () =>{ setOpen(true)}}
        className={`${navbarIconColor[themeIndex]} text-2xl`}
      >
        {/* MdColorLens */}
        <MdImagesearchRoller />

      </button>


      <Drawer
        anchor="top"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          height: 400,
          "& .MuiDrawer-paper": {
            background: "transparent",
          },
        }}
      >
        <div
          className={`${
            cardClass[themeIndex]
          } p-3 space-y-4 rounded-b-3xl overflow-y-scroll`}
        >
          <div className="between">
            <p className="text-sm font-serif font-base">Customize your chat</p>
            <MdCancel
              className=" cursor-pointer"
              onClick={() => setOpen(false)}
            />
          </div>
          {themeImg.map((img, index) => (
            <div
              className="between cursor-pointer"
              onClick={() => {
                themeIndex.setValue(index), setOpen(false);
               
              }}
              key={index}
            >
              <div className="flex items-center gap-2">
                <button
                  className={`${navbarTheme[index]} size-11 rounded-full  shadow-md shadow-gray-900 center `}
                >
                  <img
                    src={img.theme}
                    className="size-11 rounded-full  mx-1 "
                    alt="theme"
                  />
                </button>
                <p className="text-sm">{img.title}</p>
              </div>
              {themeIndex === index ? <TiTick className="" /> : null}
            </div>
          ))}
        </div>
      </Drawer>
    </>
  );
}
