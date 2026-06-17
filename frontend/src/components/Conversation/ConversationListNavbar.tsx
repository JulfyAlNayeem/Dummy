// @ts-nocheck
import React, { useState } from "react";
import { themeNavbar, themeNavbarIcon } from "@/lib/themeUtils";
import { HiMenuAlt3 } from "react-icons/hi";
import ConversationListSidebar from "../drawer/ConversationListSidebar";
import ThemeDrawer from "../drawer/ThemeDrawer";
import { Link, useParams } from "react-router-dom";
import { useUserAuth } from "../../context-reducer/UserAuthContext";
import {
  UserPlus,
  GraduationCap,
  ClipboardList,
  ShieldAlert,
  Bug,
  MailWarning,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CreateClassForm from "../class-management/CreateClassForm";
import CreateGroupForm from "./CreateGroupForm";
import chatIcon from "@/assets/icons/chatIcon.svg";
import { APP_ROUTES } from "@/routes/appRoutes/APP_ROUTES";
import { TbUserStar } from "react-icons/tb";

export default function ChatListNavbar({
  uiBounce,
  chatContainerRef,
  themeIndex = 0,
}: {
  uiBounce: boolean;
  chatContainerRef?: React.RefObject<any>;
  themeIndex?: number;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { convId } = useParams<{ convId: string }>();
  const { user }: any = useUserAuth();

  const handleClassCreated = (): void => {
    // refetchClasses();
  };

  const handleGroupCreated = (): void => {
    // Placeholder for group creation logic
  };

  return (
    <div
      className={themeNavbar(
        themeIndex,
        `${uiBounce ? "animate__slideOutUp" : "animate__slideInDown"} shadow-md px-5 h-[60px] flex items-center justify-between py-1 relative rounded-t-3xl ${!convId ? "" : ""}`,
      )}
    >
      <Link className="w-full p-2 mb-2 font-bold text-4xl rounded-md">
        <img src={chatIcon} className="size-10" alt="" />
      </Link>
      <div className="flex items-center gap-2.5">
        {user.role === "admin" || user.role === "superadmin" ? (
          <Link to={APP_ROUTES.ADMIN_DASHBOARD}>
            <TbUserStar
              className={themeNavbarIcon(
                themeIndex,
                "size-[22px] cursor-pointer",
              )}
            />
          </Link>
        ) : null}

        {/* Reports dashboard link for admin, superadmin, and developer */}
        {user.role === "admin" ||
        user.role === "superadmin" ||
        user.role === "developer" ? (
          <>
          {user.role === "developer"
                ?
               <Link
            to={
               APP_ROUTES.DEVELOPER_REPORTS
            }
            title="Reports"
          >
            <Bug
              className={themeNavbarIcon(
                themeIndex,
                "size-[22px] cursor-pointer",
              )}
            />
          </Link>:

           <Link
            to={
               APP_ROUTES.ADMIN_REPORTS
            }
            title="Reports"
          >
            <MailWarning
              className={themeNavbarIcon(
                themeIndex,
                "size-[22px] cursor-pointer",
              )}
            />
          </Link>
          }
          </>
         
        ) : null}

        <Popover>
          <PopoverTrigger asChild>
            <button>
              <UserPlus
                className={themeNavbarIcon(
                  themeIndex,
                  "size-[22px] cursor-pointer",
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto z-[110] p-0 bg-transparent border-transparent">
            <CreateGroupForm
              onGroupCreated={handleGroupCreated}
              conversationThemeIndex={themeIndex}
            />
          </PopoverContent>
        </Popover>

        {user.role === "teacher" ? (
          <Popover>
            <PopoverTrigger asChild>
              <button>
                <GraduationCap
                  className={themeNavbarIcon(themeIndex, "size-6")}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto z-[110] p-0 bg-transparent border-transparent">
              <CreateClassForm
                onClassCreated={handleClassCreated}
                conversationThemeIndex={themeIndex}
              />
            </PopoverContent>
          </Popover>
        ) : null}

        {!convId ? (
          <ThemeDrawer
            chatContainerRef={chatContainerRef}
            isChatlist={true}
            themeIndex={themeIndex}
          />
        ) : null}

        <button onClick={() => setIsOpen(true)}>
          <HiMenuAlt3
            className={themeNavbarIcon(themeIndex, "size-6 cursor-pointer")}
          />
        </button>
        <ConversationListSidebar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          themeIndex={themeIndex}
        />
      </div>
    </div>
  );
}
