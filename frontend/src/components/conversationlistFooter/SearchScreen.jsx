import React, { useState } from "react";
import { Search, Users, UserPlus, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CgArrowLongLeftC } from "react-icons/cg";
import { TiDeleteOutline } from "react-icons/ti";
import { borderColor, cardClass, chatInputBg, footerIconColor, iconColor, navbarIconColor } from "@/constant";
import SearchUsers from "./SearchUsers";
import SearchGroups from "./SearchGroups";
import SearchClasses from "./SearchClasses";
import "animate.css";

const SearchScreen = ({ themeIndex, setActiveScreen }) => {
  const [activeTab, setActiveTab] = useState("people");
  const [searchQuery, setSearchQuery] = useState("");

  const getTabIcon = (tab) => {
    switch (tab) {
      case "people":
        return Users;
      case "groups":
        return UserPlus;
      case "classes":
        return GraduationCap;
      default:
        return Users;
    }
  };

  return (
    <div className={cn("flex flex-col h-full ", )}>
      <Card className={cn("flex flex-col h-full bg-transparent border-none")}>
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex py-4 items-center gap-3 px-4 border-b border-gray-700/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveScreen("chats")}
              className={`size-9 p-0 ${chatInputBg[themeIndex]} rounded-full hover:bg-transparent`}
            >
              <CgArrowLongLeftC className={`h-5 w-5 text-gray-300`} />
            </Button>
            <div
              className={cn(
                borderColor[themeIndex],
                chatInputBg[themeIndex],
                "h-9 rounded-full border-2 relative flex items-center flex-1"
              )}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                className="transition-all duration-700 w-full pl-10 pr-4 bg-transparent outline-none text-sm placeholder:text-gray-300"
                placeholder="Search for people, groups, or classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <TiDeleteOutline
                  className="cursor-pointer text-gray-400 mr-2 text-xl"
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col bg-transparent h-full ">
                <TabsList className="grid w-full bg-transparent  gap-3 px-3 grid-cols-3 rounded-full">
                  {["people", "groups", "classes"].map((tab) => {
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
                        {tab}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

              <TabsContent value="people" className="mt-2 px-4 h-full">
                <SearchUsers
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  themeIndex={themeIndex}
                  setActiveScreen={setActiveScreen}
                />
              </TabsContent>
              <TabsContent value="groups" className="mt-2 px-4 h-full">
                <SearchGroups
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  themeIndex={themeIndex}
                />
              </TabsContent>
              <TabsContent value="classes" className="mt-2 px-4 h-full">
                <SearchClasses
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
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

export default SearchScreen;