"use client";
import ChatSidebar from "@/components/ChatSidebar";
import Loading from "@/components/Loading";
import { chat_service, useAppData } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import axios from "axios";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import MessageInput from "@/components/MessageInput";
import { SocketData } from "@/context/SocketContext";

const ChatApp = () => {
  const {
    loading,
    isAuth,
    logoutUser,
    chats,
    user: loggedInUser,
    users,
    fetchChats,
    setChats,
  } = useAppData();

  const { onlineUsers, socket } = SocketData();

  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [siderbarOpen, setSiderbarOpen] = useState(false);
  const [messages, setMessages] = useState(null);
  const [user, setUser] = useState(null);
  const [showAllUser, setShowAllUser] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeOut, setTypingTimeOut] = useState(null);

  const router = useRouter();

  useEffect(() => {
    if (!isAuth && !loading) {
      router.push("/login");
    }
  }, [isAuth, router, loading]);

  const handleLogout = () => logoutUser();

  async function fetchChat() {
    const token = Cookies.get("token");
    try {
      const { data } = await axios.get(
        `${chat_service}/api/v1/message/${selectedUser}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessages(data.messages);
      setUser(data.user);
      await fetchChats();
    } catch (error) {
      console.log(error);
      toast.error("Failed to load messages");
    }
  }

  const moveChatToTop = (chatId, newMessage, updatedUnseenCount = true) => {
    setChats((prev) => {
      if (!prev) return null;

      const updatedChats = [...prev];
      const chatIndex = updatedChats.findIndex(
        (chat) => chat.chat._id === chatId
      );

      if (chatIndex !== -1) {
        const [moveChat] = updatedChats.splice(chatIndex, 1);

        const updatedChat = {
          ...moveChat,
          chat: {
            ...moveChat.chat,
            latestMessage: {
              text: newMessage.text,
              sender: newMessage.sender,
            },
            updatedAt: new Date().toString(),

            unseenCount:
              updatedUnseenCount && newMessage.sender !== loggedInUser?._id
                ? (moveChat.chat.unseenCount || 0) + 1
                : moveChat.chat.unseenCount || 0,
          },
        };

        updatedChats.unshift(updatedChat);
      }

      return updatedChats;
    });
  };

  const resetUnseenCount = (chatId) => {
    setChats((prev) => {
      if (!prev) return null;

      return prev.map((chat) => {
        if (chat.chat._id === chatId) {
          return {
            ...chat,
            chat: {
              ...chat.chat,
              unseenCount: 0,
            },
          };
        }
        return chat;
      });
    });
  };

  async function createChat(u) {
    try {
      const token = Cookies.get("token");
      const { data } = await axios.post(
        `${chat_service}/api/v1/chat/new`,
        {
          userId: loggedInUser?._id,
          otherUserId: u._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSelectedUser(data.chatId);
      setShowAllUser(false);
      await fetchChats();
    } catch (error) {
      toast.error("Failed to start chat");
    }
  }

  const handleMessageSend = async (e, imageFile = null) => {
    e.preventDefault();

    if (!message.trim() && !imageFile) return;
    if (!selectedUser) return;

    // socket work
    if (typingTimeOut) {
      clearTimeout(typingTimeOut);
      setTypingTimeOut(null);
    }

    socket?.emit("stopTyping", {
      chatId: selectedUser,
      userId: loggedInUser?._id,
    });

    const token = Cookies.get("token");

    try {
      const formData = new FormData();
      formData.append("chatId", selectedUser);

      if (message.trim()) {
        formData.append("text", message);
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const { data } = await axios.post(
        `${chat_service}/api/v1/message`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessages((prev) => {
        const currentMessages = prev || [];
        const messageExists = currentMessages.some(
          (msg) => msg._id === data.message._id
        );

        if (!messageExists) {
          return [...currentMessages, data.message];
        }
        return currentMessages;
      });

      setMessage("");

      const displayText = imageFile ? "📷 image" : message;

      moveChatToTop(
        selectedUser,
        {
          text: displayText,
          sender: data.sender,
        },
        false
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  };

  const handleTyping = (value) => {
    setMessage(value);

    if (!selectedUser || !socket) return;

    if (value.trim()) {
      socket.emit("typing", {
        chatId: selectedUser,
        userId: loggedInUser?._id,
      });
    }

    if (typingTimeOut) {
      clearTimeout(typingTimeOut);
    }

    const timeout = setTimeout(() => {
      socket.emit("stopTyping", {
        chatId: selectedUser,
        userId: loggedInUser?._id,
      });
    }, 2000);

    setTypingTimeOut(timeout);
  };

  useEffect(() => {
    socket?.on("newMessage", (message) => {
      console.log("Received new message:", message);

      if (selectedUser === message.chatId) {
        setMessages((prev) => {
          const currentMessages = prev || [];
          const messageExists = currentMessages.some(
            (msg) => msg._id === message._id
          );

          if (!messageExists) {
            return [...currentMessages, message];
          }
          return currentMessages;
        });

        moveChatToTop(message.chatId, message, false);
      } else {
        moveChatToTop(message.chatId, message, true);
      }
    });

    socket?.on("messagesSeen", (data) => {
      console.log("Message seen by:", data);

      if (selectedUser === data.chatId) {
        setMessages((prev) => {
          if (!prev) return null;
          return prev.map((msg) => {
            if (
              msg.sender === loggedInUser?._id &&
              data.messageIds &&
              data.messageIds.includes(msg._id)
            ) {
              return {
                ...msg,
                seen: true,
                seenAt: new Date().toString(),
              };
            } else if (msg.sender === loggedInUser?._id && !data.messageIds) {
              return {
                ...msg,
                seen: true,
                seenAt: new Date().toString(),
              };
            }
            return msg;
          });
        });
      }
    });

    socket?.on("userTyping", (data) => {
      console.log("received user typing", data);
      if (data.chatId === selectedUser && data.userId !== loggedInUser?._id) {
        setIsTyping(true);
      }
    });

    socket?.on("userStoppedTyping", (data) => {
      console.log("received user stopped typing", data);
      if (data.chatId === selectedUser && data.userId !== loggedInUser?._id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket?.off("newMessage");
      socket?.off("messagesSeen");
      socket?.off("userTyping");
      socket?.off("userStoppedTyping");
    };
  }, [socket, selectedUser, setChats, loggedInUser?._id]);

  useEffect(() => {
    if (selectedUser) {
      fetchChat();
      setIsTyping(false);

      resetUnseenCount(selectedUser);

      socket?.emit("joinChat", selectedUser);

      return () => {
        socket?.emit("leaveChat", selectedUser);
        setMessages(null);
      };
    }
  }, [selectedUser, socket]);

  useEffect(() => {
    return () => {
      if (typingTimeOut) {
        clearTimeout(typingTimeOut);
      }
    };
  }, [typingTimeOut]);

  if (loading) return <Loading />;
  return (
    <div className="min-h-screen flex bg-gray-900 text-white relative overflow-hidden">
      <ChatSidebar
        sidebarOpen={siderbarOpen}
        setSidebarOpen={setSiderbarOpen}
        showAllUsers={showAllUser}
        setShowAllUsers={setShowAllUser}
        users={users}
        loggedInUser={loggedInUser}
        chats={chats}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        handleLogout={handleLogout}
        createChat={createChat}
        onlineUsers={onlineUsers}
      />
      <div className="flex-1 flex flex-col justify-between p-4 backdrop-blur-xl bg-white/5 border-1 border-white/10">
        <ChatHeader
          user={user}
          setSidebarOpen={setSiderbarOpen}
          isTyping={isTyping}
          onlineUsers={onlineUsers}
        />

        <ChatMessages
          selectedUser={selectedUser}
          messages={messages}
          loggedInUser={loggedInUser}
        />

        <MessageInput
          selectedUser={selectedUser}
          message={message}
          setMessage={handleTyping}
          handleMessageSend={handleMessageSend}
        />
      </div>
    </div>
  );
};

export default ChatApp;
