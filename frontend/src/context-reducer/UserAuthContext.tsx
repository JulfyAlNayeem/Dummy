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

  const socket = useRef(null);
  const messageSocketRef = useRef(null);

  const MESSAGE_EVENTS = useMemo(
    () => new Set([
      'sendMessage',
      'message:send',
      'sendEmoji',
      'message:sendEmoji',
      'typing',
      'message:typing',
      'messageRead',
      'message:read',
      'messageDelivered',
      'message:delivered',
      'deleteMessage',
      'message:delete',
      'replyMessage',
      'message:reply',
      'editMessage',
      'message:edit',
      'addReaction',
      'message:react',
      'removeReaction',
      'message:unreact',
      'receiveMessage',
      'sendMessageSuccess',
      'sendMessageError',
      'messagesRead',
      'messagesDelivered',
      'messageDeleted',
      'deleteMessageError',
      'replyReceiveMessage',
      'replyMessageSuccess',
      'replyMessageError',
      'messageEdited',
      'message:edited',
      'editMessageSuccess',
      'editMessageError',
      'reactionsUpdated',
      'reactionSuccess',
      'reactionError',
      'unreactionSuccess',
      'unreactionError',
      'message:joinRoom',
      'joinRoom',
      'leaveRoom',
      'refreshConversationRooms',
      'conversationRoomsRefreshed',
      'encryption:exchange-key',
      'encryption:regenerate-key',
      'encryption:fetch-keys',
      'encryption:verify-key',
      'encryption:key-generated',
      'encryption:key-exchanged',
      'encryption:key-updated',
    ]),
    []
  );

  const createSocketBridge = useCallback((apiSocket, msgSocket) => {
    if (!apiSocket) return null;
    if (!msgSocket) return apiSocket;

    const routeToMessage = (eventName) => MESSAGE_EVENTS.has(eventName);
    const baseEmit = apiSocket.emit.bind(apiSocket);
    const baseOn = apiSocket.on.bind(apiSocket);
    const baseOff = apiSocket.off.bind(apiSocket);
    const baseOnce = apiSocket.once.bind(apiSocket);

    return {
      emit(eventName, ...args) {
        if (routeToMessage(eventName)) {
          return msgSocket.emit(eventName, ...args);
        }
        return baseEmit(eventName, ...args);
      },
      on(eventName, ...args) {
        if (routeToMessage(eventName)) {
          msgSocket.on(eventName, ...args);
          return this;
        }
        return baseOn(eventName, ...args);
      },
      off(eventName, ...args) {
        if (routeToMessage(eventName)) {
          msgSocket.off(eventName, ...args);
          return this;
        }
        return baseOff(eventName, ...args);
      },
      once(eventName, ...args) {
        if (routeToMessage(eventName)) {
          msgSocket.once(eventName, ...args);
          return this;
        }
        return baseOnce(eventName, ...args);
      },
      connect() {
        apiSocket.connect();
        msgSocket.connect();
        return this;
      },
      disconnect() {
        apiSocket.disconnect();
        msgSocket.disconnect();
        return this;
      },
      get id() {
        return apiSocket.id;
      },
      get connected() {
        return apiSocket.connected;
      },
    };
  }, [MESSAGE_EVENTS]);
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
      const messageToken = sessionStorage.getItem('msg_token') || undefined;
      
      const apiSocket = io(socketUrl, {
        withCredentials: true, // Cookies will be sent automatically
        path: '/socket.io',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000,
        transports: ['websocket', 'polling'],
      });

      const messageSocket = io(socketUrl, {
        withCredentials: true,
        path: '/message-socket',
        auth: messageToken ? { token: messageToken } : {},
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000,
        transports: ['websocket', 'polling'],
      });

      messageSocketRef.current = messageSocket;
      socket.current = createSocketBridge(apiSocket, messageSocket);
      
      // Add debugging listeners
      apiSocket.on('connect', () => {
        console.log('✅ Socket connected:', apiSocket.id);
        // Rejoin rooms after reconnection
        apiSocket.emit("userOnline", currentUser.id);
        apiSocket.emit("join", `user_${currentUser.id}`);
      });
      apiSocket.on('disconnect', (reason) => {
        console.log('⚠️  Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          apiSocket.connect();
        }
      });
      apiSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        // Re-emit user online and rejoin rooms
        apiSocket.emit("userOnline", currentUser.id);
        apiSocket.emit("join", `user_${currentUser.id}`);
      });
      apiSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
      });
      apiSocket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error.message);
      });
      apiSocket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
      });
      apiSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message || error);
      });

      messageSocket.on('connect_error', (error) => {
        console.error('❌ Message socket connection error:', error.message || error);
      });
      
      apiSocket.emit("userOnline", currentUser.id);
      apiSocket.emit("join", `user_${currentUser.id}`); // Join user-specific room
      apiSocket.on("loggedUsersUpdate", (loggedUsers) => {
        if (currentUser) {
          // Filter out any null/undefined values from the logged users array
          const validUsers = (loggedUsers || []).filter(u => u && u.id);
          setOnlineUsers(validUsers);
        }
      });
    },
    [createSocketBridge]
  );

  const loginUser = useCallback(
    async (userData) => {
      try {
        const { data } = await apiInterceptor.post(`${AUTH_URL}login/`, userData);
        // Dispatch setCredentials to update Redux state
        // Tokens are now stored in HTTP-only cookies by the backend (more secure)
        if (data && data.user) {
          if (data.access) sessionStorage.setItem('msg_token', data.access);
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
      if (user) {
        try {
          const { data } = await apiInterceptor.get(`${AUTH_URL}me/`);
          // Dispatch setCredentials to update Redux state
          dispatch(setCredentials({ user: data.user }));
          initializeSocket(data.user);

          // Fetch missed reminders for this user and store in localStorage per conversation
          try {
            const missedResp = await apiInterceptor.get(`${BASE_URL}reminders/missed`);
            const missed = missedResp.data?.reminders || [];
            if (missed.length > 0) {
              // Group by conversation and store in localStorage
              missed.forEach(r => {
                try {
                  const key = `missed_reminders_${r.conversationId}`;
                  const existing = JSON.parse(localStorage.getItem(key) || '[]');
                  const missedBy = Math.max(1, Math.floor((Date.now() - new Date(r.datetime)) / 60000));
                  const item = { id: r.id || r.id, title: r.title, note: r.note, datetime: r.datetime, missedBy };
                  // Avoid duplicates
                  if (!existing.find(e => e.id === item.id)) {
                    existing.push(item);
                    localStorage.setItem(key, JSON.stringify(existing));
                  }
                } catch (e) {
                  console.error('Failed to store missed reminder in localStorage', e);
                }
              });

              // Show a toast summary
              try {
                // lazy import to avoid circular deps
                const { toast } = await import('@/hooks/use-toast').then(m => m);
                toast({ title: `You have ${missed.length} missed reminder${missed.length !== 1 ? 's' : ''}` });
              } catch (e) {
                // ignore toast errors
              }
            }
          } catch (e) {
            console.error('Failed to fetch missed reminders after login', e);
          }
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
      if (!user || !user.id) {
        console.error("User is not logged in or user ID is missing");
        return;
      }

      try {
        const response = await apiInterceptor.patch(
          `${AUTH_URL}update/${user.id}`,
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
    () => onlineUsers.filter((u) => u && u.id !== user?.id),
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
      if (messageSocketRef.current) {
        messageSocketRef.current.disconnect();
        messageSocketRef.current = null;
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

