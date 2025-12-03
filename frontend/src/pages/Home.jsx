import React, { useEffect, useRef, useState } from "react";
import WelcomePage from "../components/other/WelcomePage";
import { borderColor, miniThemeBg, navbarIconColor, themeBg } from "../constant";
import "../custom.css";
import ConversationList from "../components/Conversation/ConversationList";
import { useUser } from "@/redux/slices/authSlice";

export default function Home() {
  const [themeBackground, setThemeBackground] = useState(themeBg);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { user } = useUser({});
  const chatContainerRef = useRef(null);
  const welcomePageRef = useRef();
  const themeIndex = user.themeIndex;
  const chatListStyles = {
    container: {
      backgroundImage: `url(${miniThemeBg[themeIndex]})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center bottom',
      overflow: "hidden",
    },
  };

  const getBackgroundImage = () => {
    if (windowWidth <= 765) {
      setThemeBackground(miniThemeBg);
    } else {
      setThemeBackground(themeBg);
    }
  };
  const handleResize = () => {
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
        className={` ${navbarIconColor[themeIndex]} ${borderColor[themeIndex]}
          relative w-full md:w-2/5 md:flex flex-col`}
        style={!welcomePageVisible ? chatListStyles.container : {}}
      >
        <ConversationList themeIndex={themeIndex} chatContainerRef={chatContainerRef} />
      </section>
      <WelcomePage ref={welcomePageRef} />
    </main>
  );
}