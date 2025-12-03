import { useContext, useCallback } from 'react';
import { UserContext } from './UserContext';

const useUserActions = () => {
  const { setUserInfo, unsetUserInfo } = useContext(UserContext);

  const login = useCallback((userInfo) => {
    setUserInfo(userInfo);
  }, [setUserInfo]);

  const logout = useCallback(() => {
    unsetUserInfo();
  }, [unsetUserInfo]);

  return { login, logout };
};

export default useUserActions;
