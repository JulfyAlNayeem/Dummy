import { BsFileBreakFill } from "react-icons/bs";
import { PiBookOpenTextFill } from "react-icons/pi";
import { TbBooks } from "react-icons/tb";
import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import toast, { Toaster } from "react-hot-toast";
import LessonSplitter from "../chatroom/LessonSplitter";
import QuickLesson from "../Conversation/QuickLessonContainer";
import Book from "../../components/Svg/Book";
import { iconColor, borderColor, secondColor, sheetColor } from "../../constant";
import { useUser } from "@/redux/slices/authSlice";
import Book2 from "../Svg/Book2";

const LessonsButton = ({ themeIndex }) => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(1);

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const handleSetVisible = (value) => {
    setVisible(value);
    // Show toast based on the selected view
    switch (value) {
      case 1:
        toast.success("Viewing Quick Lesson", {
          style: {
            background: secondColor[themeIndex],
            color: iconColor[themeIndex],
            border: `1px solid ${borderColor[themeIndex]}`,
            
          },
        });
        break;
      case 2:
        toast.success("Viewing Books", {
          style: {
            background: secondColor[themeIndex],
            color: iconColor[themeIndex],
            border: `1px solid ${borderColor[themeIndex]}`,
            
          },
        });
        break;
      case 3:
        toast.success("Viewing Lesson Splitter", {
          style: {
            background: secondColor[themeIndex],
            color: iconColor[themeIndex],
            border: `1px solid ${borderColor[themeIndex]}`,
            
          },
        });
        break;
      default:
        break;
    }
  };

  return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <div
            className={`${borderColor[themeIndex]} ml-1 border-r-2 border-l-transparent chatIcon cursor-pointer`}
            onClick={() => setOpen(true)}
          >
            <Book themeIndex={themeIndex} open={open} />
            {/* <Book2/> */}
          </div>
        </DrawerTrigger>
        <DrawerContent
          className={`
            min-h-[60vh]
            rounded-t-3xl 
            border-transparent
            px-4 
            py-6 
            overflow-y-auto
            ${sheetColor[themeIndex]}
          `}
        >
          <VisuallyHidden>
            <DialogTitle>Lessons Drawer</DialogTitle>
          </VisuallyHidden>
          <DialogDescription className="sr-only">
            Select lesson options or split lessons from the drawer.
          </DialogDescription>

          <div className="w-full flex justify-between text-blue-400 mb-5">
            <button
              className={`
                ${visible === 1 ? "border-b-2 text-blue-600 border-blue-600" : "border-b-transparent"} 
                pb-0.5
              `}
              onClick={() => handleSetVisible(1)}
              style={{ borderColor: borderColor[themeIndex] }}
            >
              <PiBookOpenTextFill className={`${iconColor[themeIndex]} text-2xl`} />
            </button>

            <div className="flex items-center gap-4">
              <button
                className={`
                  ${visible === 2 ? "border-b-2 text-blue-600 border-blue-600" : "border-b-transparent"} 
                  pb-0.5
                `}
                onClick={() => handleSetVisible(2)}
                style={{ borderColor: borderColor[themeIndex] }}
              >
                <TbBooks className={`${iconColor[themeIndex]} text-2xl`} />
              </button>

              <button
                className={`
                  ${visible === 3 ? "border-b-2 text-blue-600 border-blue-600" : "border-b-transparent"} 
                  pb-0.5
                `}
                onClick={() => handleSetVisible(3)}
                style={{ borderColor: borderColor[themeIndex] }}
              >
                <BsFileBreakFill className={`${iconColor[themeIndex]} text-xl`} />
              </button>
            </div>
          </div>
          {visible === 1 ? (
            <QuickLesson setVisible={setVisible} />
          ) : visible === 3 ? (
            <LessonSplitter themeIndex={themeIndex} />
          ) : null}
        </DrawerContent>
      </Drawer>
  );
};

export default LessonsButton;