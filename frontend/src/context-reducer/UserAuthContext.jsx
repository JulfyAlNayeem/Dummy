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

const useUserAuth = () => useContext(UserAuthContext);

const UserAuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allConversations, setAllConversations] = useState([]);
  const [logoutMutation] = useLogoutMutation();

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
      
      // In both dev and production, connect to same origin
      // Vite proxy (dev) and nginx (prod) will forward /socket.io to backend
      const socketUrl = window.location.origin;
      
      socket.current = io(socketUrl, {
        withCredentials: true, // Cookies will be sent automatically
        path: '/socket.io',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000,
        transports: ['websocket', 'polling'],
      });
      
      // Add debugging listeners
      socket.current.on('connect', () => {
        console.log('✅ Socket connected:', socket.current.id);
        // Rejoin rooms after reconnection
        socket.current.emit("userOnline", currentUser._id);
        socket.current.emit("join", `user_${currentUser._id}`);
      });
      socket.current.on('disconnect', (reason) => {
        console.log('⚠️  Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socket.current.connect();
        }
      });
      socket.current.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        // Re-emit user online and rejoin rooms
        socket.current.emit("userOnline", currentUser._id);
        socket.current.emit("join", `user_${currentUser._id}`);
      });
      socket.current.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
      });
      socket.current.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error.message);
      });
      socket.current.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
      });
      socket.current.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message || error);
      });
      
      socket.current.emit("userOnline", currentUser._id);
      socket.current.emit("join", `user_${currentUser._id}`); // Join user-specific room
      socket.current.on("loggedUsersUpdate", (loggedUsers) => {
        if (currentUser) setOnlineUsers(loggedUsers);
      });
    },
    []
  );

  const loginUser = useCallback(
    async (userData) => {
      try {
        const { data } = await apiInterceptor.post(`${AUTH_URL}login/`, userData);
        // Dispatch setCredentials to update Redux state
        // Tokens are now stored in HTTP-only cookies by the backend (more secure)
        if (data && data.user) {
          dispatch(setCredentials({ user: data.user, isAuthenticated: true }));
          initializeSocket(data.user);
        }
        else {
          dispatch(setCredentials({ user: null, isAuthenticated: false }));
        }
        return data;
      } catch (error) {
        console.error("Login error:", error);
        // Dispatch error (handled by extraReducers in authSlice)
        throw error;
      }
    },
    [dispatch, initializeSocket]
  );

  const logoutUser = useCallback(
    async () => {
      try {
        const response = await logoutMutation().unwrap(); // Use useLogoutMutation
        console.log('logoutUser response:', response); // Debug
        dispatch(logoutAction()); // Reset auth state
        return response; // Return response for handleLogout
      } catch (error) {
        console.error("Error logging out:", error);
        throw error;
      } finally {
        // Cookies are cleared by the backend
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
      if (user) {
        try {
          const { data } = await apiInterceptor.get(`${AUTH_URL}me/`);
          // Dispatch setCredentials to update Redux state
          dispatch(setCredentials({ user: data.user }));
          initializeSocket(data.user);
        } catch (error) {
          if (error.response) {
            dispatch(setCredentials({ user: null, isAuthenticated: false }));
            if (error.response.status === 401 || error.response.status === 403) {
              // Unauthenticated user
            } else {
              console.error("Server error:", error.response.status);
            }
          } else {
            console.error("Network or unexpected error:", error);
          }
        } finally {
          // Loading state is managed by extraReducers in authSlice
        }
      }
    },
    [dispatch, initializeSocket]
  );

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
          // Update Redux state with new user data
          dispatch(setCredentials({ user: { ...user, ...updateData } }));
        } else {
          throw new Error("Error updating user information");
        }
      } catch (error) {
        console.error("Error updating user information:", error.message);
        // Optionally dispatch clearError if needed
        dispatch(clearError());
      }
    },
    [dispatch, user]
  );

  const filteredOnlineUsers = useMemo(
    () => onlineUsers.filter((u) => u._id !== user?._id),
    [onlineUsers, user]
  );

  useEffect(() => {
    fetchUserInfo(); // Load user data from API when app starts

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
        socket: socket.current, // Back to providing socket.current
        socketRef: socket, // Also provide the ref for components that need it
        allConversations,
        clearError: () => dispatch(clearError()),
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
};

export { UserAuthProvider, useUserAuth };

