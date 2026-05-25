/**
 * Theme Utilities with cn() Integration
 * 
 * Provides elegant helper functions for applying theme classes
 * using the cn() utility for better class management.
 */

import { cn } from "./utils";
import { 
  theme, 
  navbarTheme, 
  iconColor, 
  chatInputBg, 
  navbarIconColor, 
  borderColor, 
  footerIconColor, 
  searchBox, 
  footerBg, 
  chatOptionBg, 
  sidebarBg, 
  cardClass, 
  themeBgColor as themeBgColorArray, 
  messageSenderCard,
  senderMessageCard,
  receiverMessageCard,
  markerShape
} from "@/constant";

/**
 * Type-safe theme index with fallback to 0
 */
const safeIndex = (index: number): number => {
  return index >= 0 && index < 13 ? index : 0;
};

/**
 * Get background theme class combined with additional classes
 */
export const themeBg = (themeIndex: number, ...classes: string[]) => {
  return cn(theme[safeIndex(themeIndex)], ...classes);
};

/**
 * Get navbar theme class combined with additional classes
 */
export const themeNavbar = (themeIndex: number, ...classes: string[]) => {
  return cn(navbarTheme[safeIndex(themeIndex)], ...classes);
};

/**
 * Get icon color theme combined with additional classes
 */
export const themeIcon = (themeIndex: number, ...classes: string[]) => {
  return cn(iconColor[safeIndex(themeIndex)], ...classes);
};

/**
 * Get navbar icon color theme combined with additional classes
 */
export const themeNavbarIcon = (themeIndex: number, ...classes: string[]) => {
  return cn(navbarIconColor[safeIndex(themeIndex)], ...classes);
};

/**
 * Get border color theme combined with additional classes
 */
export const themeBorder = (themeIndex: number, ...classes: string[]) => {
  return cn(borderColor[safeIndex(themeIndex)], ...classes);
};

/**
 * Get footer icon color theme combined with additional classes
 */
export const themeFooterIcon = (themeIndex: number, ...classes: string[]) => {
  return cn(footerIconColor[safeIndex(themeIndex)], ...classes);
};

/**
 * Get chat input background theme combined with additional classes
 */
export const themeChatInput = (themeIndex: number, ...classes: string[]) => {
  return cn(chatInputBg[safeIndex(themeIndex)], ...classes);
};

/**
 * Get search box theme combined with additional classes
 */
export const themeSearchBox = (themeIndex: number, ...classes: string[]) => {
  return cn(searchBox[safeIndex(themeIndex)], ...classes);
};

/**
 * Get footer background theme combined with additional classes
 */
export const themeFooterBg = (themeIndex: number, ...classes: string[]) => {
  return cn(footerBg[safeIndex(themeIndex)], ...classes);
};

/**
 * Get chat option background theme combined with additional classes
 */
export const themeChatOption = (themeIndex: number, ...classes: string[]) => {
  return cn(chatOptionBg[safeIndex(themeIndex)], ...classes);
};

/**
 * Get sidebar background theme combined with additional classes
 */
export const themeSidebar = (themeIndex: number, ...classes: string[]) => {
  return cn(sidebarBg[safeIndex(themeIndex)], ...classes);
};

/**
 * Get card class theme combined with additional classes
 */
export const themeCard = (themeIndex: number, ...classes: string[]) => {
  return cn(cardClass[safeIndex(themeIndex)], ...classes);
};

/**
 * Get theme background color combined with additional classes
 */
export const themeBgColor = (themeIndex: number, ...classes: string[]) => {
  return cn(themeBgColorArray[safeIndex(themeIndex)], ...classes);
};

/**
 * Get message sender card theme combined with additional classes
 */
export const themeMessageSender = (themeIndex: number, ...classes: string[]) => {
  return cn(messageSenderCard[safeIndex(themeIndex)], ...classes);
};

/**
 * Get sender message bubble theme combined with additional classes
 */
export const themeSenderMessage = (themeIndex: number, ...classes: string[]) => {
  return cn(senderMessageCard[safeIndex(themeIndex)], ...classes);
};

/**
 * Get receiver message bubble theme combined with additional classes
 */
export const themeReceiverMessage = (themeIndex: number, ...classes: string[]) => {
  return cn(receiverMessageCard[safeIndex(themeIndex)], ...classes);
};

/**
 * Get marker shape positioning
 */
export const themeMarkerShape = (themeIndex: number) => {
  return markerShape[safeIndex(themeIndex)];
};

/**
 * Combine multiple theme classes elegantly
 * Example: themeClasses(themeIndex, 'navbarIcon', 'border', 'custom-class')
 */
export const themeClasses = (
  themeIndex: number,
  ...args: (ThemeKey | string)[]
) => {
  const classes: string[] = [];
  const index = safeIndex(themeIndex);

  for (const arg of args) {
    if (isThemeKey(arg)) {
      classes.push(getThemeClass(index, arg));
    } else {
      classes.push(arg);
    }
  }

  return cn(...classes);
};

/**
 * Theme key type for type safety
 */
type ThemeKey =
  | "bg"
  | "navbar"
  | "icon"
  | "navbarIcon"
  | "border"
  | "footerIcon"
  | "chatInput"
  | "searchBox"
  | "footerBg"
  | "chatOption"
  | "sidebar"
  | "card"
  | "bgColor"
  | "messageSender"
  | "senderMessage"
  | "receiverMessage";

/**
 * Check if a string is a valid theme key
 */
const isThemeKey = (key: string): key is ThemeKey => {
  return [
    "bg",
    "navbar",
    "icon",
    "navbarIcon",
    "border",
    "footerIcon",
    "chatInput",
    "searchBox",
    "footerBg",
    "chatOption",
    "sidebar",
    "card",
    "bgColor",
    "messageSender",
    "senderMessage",
    "receiverMessage",
  ].includes(key);
};

/**
 * Get theme class by key
 */
const getThemeClass = (themeIndex: number, key: ThemeKey): string => {
  const index = safeIndex(themeIndex);
  
  switch (key) {
    case "bg":
      return theme[index];
    case "navbar":
      return navbarTheme[index];
    case "icon":
      return iconColor[index];
    case "navbarIcon":
      return navbarIconColor[index];
    case "border":
      return borderColor[index];
    case "footerIcon":
      return footerIconColor[index];
    case "chatInput":
      return chatInputBg[index];
    case "searchBox":
      return searchBox[index];
    case "footerBg":
      return footerBg[index];
    case "chatOption":
      return chatOptionBg[index];
    case "sidebar":
      return sidebarBg[index];
    case "card":
      return cardClass[index];
    case "bgColor":
      return themeBgColorArray[index];
    case "messageSender":
      return messageSenderCard[index];
    case "senderMessage":
      return senderMessageCard[index];
    case "receiverMessage":
      return receiverMessageCard[index];
    default:
      return "";
  }
};

/**
 * React Hook for theme classes
 * Usage: const classes = useThemeClasses(themeIndex, 'navbarIcon', 'border', 'px-4')
 */
export const useThemeClasses = (
  themeIndex: number,
  ...args: (ThemeKey | string)[]
): string => {
  return themeClasses(themeIndex, ...args);
};
