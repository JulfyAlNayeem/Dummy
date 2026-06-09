// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import WelcomePage from "./WelcomePage";
import { miniThemeBg, themeBg } from "../constant";
import { themeClasses } from "@/lib/themeUtils";
import "../custom.css";
import ConversationList from "../components/Conversation/ConversationList";
import { useUser } from "@/redux/slices/authSlice";

export default function Home(): JSX.Element {
  const [themeBackground, setThemeBackground] = useState<any>(themeBg);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const { user }: any = useUser({});
  const chatContainerRef = useRef<HTMLElement>(null);
  const welcomePageRef = useRef<any>();
  const themeIndex: number = user.themeIndex;
  const chatListStyles = {
    container: {
      backgroundImage: `url(${miniThemeBg[themeIndex]})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center bottom',
      overflow: "hidden",
    },
  };

  const getBackgroundImage = (): void => {
    if (windowWidth <= 765) {
      setThemeBackground(miniThemeBg);
    } else {
      setThemeBackground(themeBg);
    }
  };
  const handleResize = (): void => {
    setWindowWidth(window.innerWidth);
  };
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    getBackgroundImage();
  }, [windowWidth, miniThemeBg, themeIndex]);

  const styles = {
    container: {
      backgroundImage: `url(${themeBackground[themeIndex]})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center bottom',
      overflow: 'hidden',
      minHeight: '100vh',
    },
  };

  // Access welcomePageVisible from the ref
  const welcomePageVisible = welcomePageRef.current?.welcomePageVisible;

  return (
    <main
      className="flex"
      ref={chatContainerRef}
      style={styles.container}
    >
      <section
        className={themeClasses(
          themeIndex,
          "navbarIcon",
          "border",
          "relative w-full md:w-2/5 md:flex flex-col"
        )}
        style={!welcomePageVisible ? chatListStyles.container : {}}
      >
        <ConversationList themeIndex={themeIndex} chatContainerRef={chatContainerRef} />
      </section>
      <WelcomePage ref={welcomePageRef} />
    </main>
  );
}