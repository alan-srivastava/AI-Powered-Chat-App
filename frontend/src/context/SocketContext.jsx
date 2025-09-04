"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { chat_service, useAppData } from "./AppContext";

const SocketContext = createContext({
  socket: null,
  onlineUsers: [],
});

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAppData();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user?._id) return;

    const newSocket = io(chat_service, {
      query: {
        userId: user._id,
      },
    });

    setSocket(newSocket);

    newSocket.on("getOnlineUser", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const SocketData = () => useContext(SocketContext);
