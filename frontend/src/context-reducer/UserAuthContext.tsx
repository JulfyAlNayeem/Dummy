// @ts-nocheck
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import apiInterceptor from "../utils/apiInterceptor";
import { io } from "socket.io-client";
import { AUTH_URL, BASE_URL } from "../utils/baseUrls";
import {
  setCredentials,
  logout as logoutAction,
  clearError,
  selectCurrentUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from "@/redux/slices/authSlice";
import { useLogoutMutation } from "@/redux/api/user/userApi";

const UserAuthContext = createContext();

const useUserAuth = (): any => useContext(UserAuthContext);

const UserAuthProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const dispatch = useDispatch();
  const user: any = useSelector(selectCurrentUser);
  const isAuthenticated: any = useSelector(selectIsAuthenticated);
  const loading: any = useSelector(selectAuthLoading);
  const authError: any = useSelector(selectAuthError);

  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [logoutMutation]: any = useLogoutMutation();

  // Single socket — all events go through /socket.io
  // Backend GatewayManager routes to the correct gateway by event name
  const socket = useRef(null);

  const registerUser = useCallback(
    async (userData) => {
      try {
        const { data, status } = await apiInterceptor.post(`${AUTH_URL}register/`, userData);
        console.log("Registration response:", { status, data });
        return { status, data, message: data.message || "Registration successful" };
      } catch (error) {
        console.error("Registration error:", error);
        return {
          status: error.response?.status || 500,
          data: error.response?.data || null,
          message: error.response?.data?.message || error.message || "Registration failed",
        };
      }
    },
    [dispatch]
  );

  const initializeSocket = useCallback(
    (currentUser) => {
      if (!currentUser || socket.current) return;

      const socketUrl = window.location.origin;

      const newSocket = io(socketUrl, {
        withCredentials: true,
        path: '/socket.io',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000,
        transports: ['polling', 'websocket'],
      });

      socket.current = newSocket;

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        newSocket.emit("userOnline", currentUser._id);
        newSocket.emit("join", `user_${currentUser._id}`);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('⚠️  Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          newSocket.connect();
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        newSocket.emit("userOnline", currentUser._id);
        newSocket.emit("join", `user_${currentUser._id}`);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message || error);
      });

      newSocket.emit("userOnline", currentUser._id);
      newSocket.emit("join", `user_${currentUser._id}`);

      newSocket.on("loggedUsersUpdate", (loggedUsers) => {
        if (currentUser) {
          const validUsers = (loggedUsers || []).filter(u => u && u._id);
          setOnlineUsers(validUsers);
        }
      });
    },
    [] // stable — no deps
  );

  const loginUser = useCallback(
    async (userData) => {
      try {
        const { data } = await apiInterceptor.post(`${AUTH_URL}login/`, userData);
        if (data && data.user) {
          if (data.access) sessionStorage.setItem('msg_token', data.access);
          dispatch(setCredentials({ user: data.user, isAuthenticated: true }));
          initializeSocket(data.user);
        } else {
          dispatch(setCredentials({ user: null, isAuthenticated: false }));
        }
        return data;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    [dispatch, initializeSocket]
  );

  const logoutUser = useCallback(
    async () => {
      try {
        const response = await logoutMutation().unwrap();
        console.log('logoutUser response:', response);
        dispatch(logoutAction());
        return response;
      } catch (error) {
        console.error("Error logging out:", error);
        throw error;
      } finally {
        sessionStorage.removeItem('msg_token');
        if (socket.current) {
          socket.current.disconnect();
          socket.current = null;
        }
      }
    },
    [logoutMutation, dispatch]
  );

const fetchUserInfo = useCallback(
  async () => {
    // No `user` check here — caller decides
    try {
      const { data } = await apiInterceptor.get(`${AUTH_URL}me/`);
      dispatch(setCredentials({ user: data.user }));
      initializeSocket(data.user);
      // ... reminders fetch
    } catch (error) {
      if (error.response) {
        dispatch(setCredentials({ user: null, isAuthenticated: false }));
        if (error.response.status !== 401 && error.response.status !== 403) {
          console.error("Server error:", error.response.status);
        }
      } else {
        console.error("Network or unexpected error:", error);
      }
    }
  },
  [dispatch, initializeSocket] // truly stable now — no `user`
);

// useEffect(() => {
//   if (user) {          
//     fetchUserInfo();
//   }

//   return () => {
//     if (socket.current) {
//       socket.current.off("loggedUsersUpdate");
//       socket.current.disconnect();
//       socket.current = null;
//     }
//   };
// }, [fetchUserInfo]);   
  const updateUserInfo = useCallback(
    async (updateData) => {
      if (!user || !user._id) {
        console.error("User is not logged in or user ID is missing");
        return;
      }
      try {
        const response = await apiInterceptor.patch(
          `${AUTH_URL}update/${user._id}`,
          updateData
        );
        if (response.status === 200) {
          dispatch(setCredentials({ user: { ...user, ...updateData } }));
        } else {
          throw new Error("Error updating user information");
        }
      } catch (error) {
        console.error("Error updating user information:", error.message);
        dispatch(clearError());
      }
    },
    [dispatch, user]
  );

  const filteredOnlineUsers = useMemo(
    () => onlineUsers.filter((u) => u && u._id !== user?._id),
    [onlineUsers, user]
  );

  useEffect(() => {
    fetchUserInfo();

    return () => {
      if (socket.current) {
        socket.current.off("loggedUsersUpdate");
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [fetchUserInfo]);

  return (
    <UserAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        error: authError,
        loading,
        onlineUsers,
        registerUser,
        loginUser,
        logoutUser,
        updateUserInfo,
        socket: socket.current,
        socketRef: socket,
        allConversations,
        clearError: () => dispatch(clearError()),
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
};

export { UserAuthProvider, useUserAuth };