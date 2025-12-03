import React, { forwardRef, useImperativeHandle, useState } from 'react';
import icon from "../../assets/icons/chatIcon.svg";
import { themeBg } from '../../constant';
import { useUser } from '@/redux/slices/authSlice';

const WelcomePage = forwardRef((props, ref) => {
  const { themeIndex } = useUser();
  const [welcomePageVisible, setWelcomePageVisible] = useState(true);

  // Expose welcomePageVisible and setWelcomePageVisible to the parent via ref
  useImperativeHandle(ref, () => ({
    welcomePageVisible,
    setWelcomePageVisible,
  }));

  const styles = {
    container: {
      backgroundImage: `url(${themeBg[themeIndex]})`,
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      overflow: "hidden",
    },
  };

  return (
    <section 
      className='hidden md:w-3/5 w-full h-screen'
      // style={!welcomePageVisible ? styles.container : {}}
    >
    </section>
  );
});

export default WelcomePage;