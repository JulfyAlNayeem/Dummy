import { MdColorLens } from "react-icons/md";
import { accordionDetails, accordionSummaryOne, cardClass, iconColor, secondColor, sheetColor, themeImg, defaultProfileImage } from "../../constant/index";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import PersonCard from "../chatroom/PersonCard";
import PersonRequest from "../chatroom/PersonRequest";
import activeFireFly from "../../assets/icons/activeFirefly.svg";
import { useUser } from "@/redux/slices/authSlice";
import { useState } from "react";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { useConversation } from "@/redux/slices/conversationSlice";
import ActiveFireFly2 from "../Svg/ActiveFirefly2";

export default function ChattabActivePersonsSidebar({activeUsers}: { activeUsers: any[] }): JSX.Element {
    const [open, setOpen] = useState<boolean>(false);
    const { themeIndex }: any = useConversation();
 
  return (
    <>
      <div className="relative cursor-pointer" onClick={() => setOpen(true)}>
        <img src={activeFireFly} className="sm:size-6 size-6" alt="Active Firefly Jar" />
        {/* <activeFireFly2/> */}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent
          side="right"
          className={`w-[270px] p-1.5 rounded-tl-3xl rounded-bl-3xl overflow-y-auto  border-transparent ${sheetColor[themeIndex]}`}
        >
          <div className="px-4 py-2">
            <div className="flex items-center justify-center ]">
              <img src={activeFireFly} className="w-12 h-14 rounded-full border-[#4aa61b]" alt="" />
              {/* <h3 className="text-gray-300 text-sm font-medium">Active Users</h3> */}
            </div>

            <div className="mt-2  max-h-48 overflow-y-auto grid grid-cols-3 overflow-x-hidden">
              {activeUsers?.length > 0 ? (
                activeUsers.map((activeUser, index) => (
                  <div
                    key={activeUser._id || index}
                    className="flex items-center flex-col justify-center  gap-1 text-xs hover:bg-gray-700/20 p-2 rounded animate__animated animate__pulse animate__faster"
                  >
                    <div className="w-12 h-12 flex items-center justify-center relative">
                      <img src={activeUser.image || defaultProfileImage} alt={activeUser.name} className="w-full h-full avatar" />
                      <span className="absolute -bottom-2 -right-4   rounded-full 0">
                        <ActiveFireFly2 />
                      </span>
                    </div>
                    {/* <span className=" truncate text-xs">{activeUser.name}</span> */}
                  </div>
                ))
              ) : (
                <div className="col-span-3 w-full h-full flex items-center justify-center">
                  <p className="text-sm text-gray-400">No active users</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}