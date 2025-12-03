import React, { useState, useEffect } from "react";
import { Search, UserCheck, Users2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CgArrowLongLeftC } from "react-icons/cg";
import { borderColor, chatInputBg } from "@/constant";
import axios from "axios";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { BASE_URL } from "@/utils/baseUrls";
import PendingConversations from "./PendingConversations";
import GroupRequests from "./GroupRequests";
import ClassRequests from "./ClassRequests";

const RequestsScreen = ({ themeIndex, setActiveScreen }) => {
  const {socket} = useUserAuth();

  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: `${BASE_URL}conversations`,
    withCredentials: true,
  });

  const getTabIcon = (tab) => {
    switch (tab) {
      case "pending":
        return UserCheck;
      case "groups":
        return Users2;
      case "classes":
        return BookOpen;
      default:
        return UserCheck;
    }
  };

  // Reset unread request counts when switching tabs
  useEffect(() => {
    if (!socket) return;

    const requestTypeMap = {
      pending: 'friend',
      groups: 'group',
      classes: 'classroom'
    };

    const requestType = requestTypeMap[activeTab];
    if (requestType) {
      socket.emit("reset_unread_request", requestType);
    }
  }, [activeTab, socket]);

  return (
    <div className={cn("flex flex-col h-full")}>
      <Card className={cn("flex flex-col h-full bg-transparent border-none")}>
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex py-4 items-center gap-3 px-4 border-b border-gray-700/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveScreen("chats")}
              className={`size-9 p-0 ${chatInputBg[themeIndex]} rounded-full`}
            >
              <CgArrowLongLeftC className={`h-5 w-5 text-gray-300`} />
            </Button>
            <div className={cn(
              borderColor[themeIndex],
              chatInputBg[themeIndex],
              "h-9 rounded-full border-2 relative flex items-center flex-1"
            )}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                className="transition-all duration-700 w-full pl-10 pr-4 bg-transparent outline-none text-sm placeholder:text-gray-300"
                placeholder="Search requests..."
                disabled // Disabled as no search functionality implemented yet, but placeholder for future
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col bg-transparent h-full">
              <TabsList className="grid w-full bg-transparent gap-3 px-3 grid-cols-3 rounded-full">
                {["pending", "groups", "classes"].map((tab) => {
                  const Icon = getTabIcon(tab);
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className={cn(
                        chatInputBg[themeIndex],
                        `flex h-7 items-center gap-2 capitalize transition-colors rounded-full text-white data-[state=active]:bg-sky-600/50 data-[state=active]:text-white`
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="pending" className="mt-2 px-4 h-full">
                <PendingConversations
                  themeIndex={themeIndex}
                  activeTab={activeTab}
                />
              </TabsContent>
              <TabsContent value="groups" className="mt-2 px-4 h-full">
                <GroupRequests
                  themeIndex={themeIndex}
                />
              </TabsContent>
              <TabsContent value="classes" className="mt-2 px-4 h-full">
                <ClassRequests
                  themeIndex={themeIndex}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RequestsScreen;