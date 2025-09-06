import axios from "axios";
import TryCatch from "../config/TryCatch.js";
import { Chat } from "../models/Chat.js";
import { Messages } from "../models/Messages.js";
import { getRecieverSocketId, io } from "../config/socket.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const createNewChat = TryCatch(async (req, res) => {
  const userId = req.user?._id;
  const { otherUserId } = req.body;

  if (!otherUserId) {
    res.status(400).json({
      message: "Other userid is required",
    });
    return;
  }

  const existingChat = await Chat.findOne({
    users: { $all: [userId, otherUserId], $size: 2 },
  });

  if (existingChat) {
    res.json({
      message: "Chat already exitst",
      chatId: existingChat._id,
    });
    return;
  }

  const newChat = await Chat.create({
    users: [userId, otherUserId],
  });

  res.status(201).json({
    message: "New Chat created",
    chatId: newChat._id,
  });
});

export const getAllChats = TryCatch(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    res.status(400).json({
      message: " UserId missing",
    });
    return;
  }

  const chats = await Chat.find({ users: userId }).sort({ updatedAt: -1 });

  const chatWithUserData = await Promise.all(
    chats.map(async (chat) => {
      const otherUserId = chat.users.find((id) => id !== userId);

      const unseenCount = await Messages.countDocuments({
        chatId: chat._id,
        sender: { $ne: userId },
        seen: false,
      });

      try {
        const { data } = await axios.get(
          `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
        );

        return {
          user: data,
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage || null,
            unseenCount,
          },
        };
      } catch (error) {
        console.log(error);
        return {
          user: { _id: otherUserId, name: "Unknown User" },
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage || null,
            unseenCount,
          },
        };
      }
    })
  );

  res.json({
    chats: chatWithUserData,
  });
});

export const sendMessage = TryCatch(async (req, res) => {
  const senderId = req.user?._id;
  const { chatId, text } = req.body;
  const imageFile = req.file;

  if (!senderId) {
    res.status(401).json({
      message: "unauthorized",
    });
    return;
  }
  if (!chatId) {
    res.status(400).json({
      message: "ChatId Required",
    });
    return;
  }

  if (!text && !imageFile) {
    res.status(400).json({
      message: "Either text or image is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (userId) => userId.toString() === senderId.toString()
  );

  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  const otherUserId = chat.users.find(
    (userId) => userId.toString() !== senderId.toString()
  );

  if (!otherUserId) {
    res.status(401).json({
      message: "No other user",
    });
    return;
  }

  // socket setup
  const receiverSocketId = getRecieverSocketId(otherUserId.toString());
  let isReceiverInChatRoom = false;

  if (receiverSocketId) {
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    if (receiverSocket && receiverSocket.rooms.has(chatId)) {
      isReceiverInChatRoom = true;
    }
  }

  let messageData = {
    chatId: chatId,
    sender: senderId,
    seen: isReceiverInChatRoom,
    seenAt: isReceiverInChatRoom ? new Date() : undefined,
  };

  if (imageFile) {
    messageData.image = {
      url: imageFile.path,
      publicId: imageFile.filename,
    };
    messageData.messageType = "image";
    messageData.text = text || "";
  } else {
    messageData.text = text;
    messageData.messageType = "text";
  }

  const message = new Messages(messageData);

  const savedMessage = await message.save();

  const latestMessageText = imageFile ? "📷 Image" : text;

  await Chat.findByIdAndUpdate(
    chatId,
    {
      latestMessage: {
        text: latestMessageText,
        sender: senderId,
      },
      updatedAt: new Date(),
    },
    { new: true }
  );

  // emit to sockets
  io.to(chatId).emit("newMessage", savedMessage);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", savedMessage);
  }

  const senderSocketId = getRecieverSocketId(senderId.toString());
  if (senderSocketId) {
    io.to(senderSocketId).emit("newMessage", savedMessage);
  }

  if (isReceiverInChatRoom && senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen", {
      chatId: chatId,
      seenBy: otherUserId,
      messageIds: [savedMessage._id],
    });
  }

  res.status(201).json({
    message: savedMessage,
    sender: senderId,
  });
});

export const getMessagesByChat = TryCatch(async (req, res) => {
  const userId = req.user?._id;
  const { chatId } = req.params;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!chatId) {
    res.status(400).json({
      message: "ChatId Required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (id) => id.toString() === userId.toString()
  );

  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  const messagesToMarkSeen = await Messages.find({
    chatId: chatId,
    sender: { $ne: userId },
    seen: false,
  });

  await Messages.updateMany(
    {
      chatId: chatId,
      sender: { $ne: userId },
      seen: false,
    },
    {
      seen: true,
      seenAt: new Date(),
    }
  );

  const messages = await Messages.find({ chatId }).sort({ createdAt: 1 });

  const otherUserId = chat.users.find((id) => id !== userId);

  try {
    const { data } = await axios.get(
      `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
    );

    if (!otherUserId) {
      res.status(400).json({
        message: "No other user",
      });
      return;
    }

    // socket work
    if (messagesToMarkSeen.length > 0) {
      const otherUserSocketId = getRecieverSocketId(otherUserId.toString());
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("messagesSeen", {
          chatId: chatId,
          seenBy: userId,
          messageIds: messagesToMarkSeen.map((msg) => msg._id),
        });
      }
    }

    res.json({
      messages,
      user: data,
    });
  } catch (error) {
    console.log(error);
    res.json({
      messages,
      user: { _id: otherUserId, name: "Unknown User" },
    });
  }
});

export const getSuggestions = TryCatch(async (req, res) => {
  const { partialMessage } = req.body;

  if (!partialMessage || partialMessage.trim().length < 3) {
    return res.status(400).json({
      message: "Partial message must be at least 3 characters long",
    });
  }

  console.log("GEMINI KEY:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      message: "Gemini API key not configured",
    });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const prompt = `You are a helpful assistant that provides word and phrase suggestions for chat messages. Provide 3-5 short, relevant suggestions based on the partial input. Keep suggestions concise and natural for casual conversation.

Complete this message: "${partialMessage}"

Please provide suggestions as a numbered list, one per line.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the suggestions from the response
    const suggestions = text
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Remove numbering
      .filter(s => s.length > 0 && s.length < 100) // Filter out empty or too long suggestions
      .slice(0, 5); // Limit to 5 suggestions

    res.json({
      suggestions,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({
      message: "Failed to get suggestions",
    });
  }
});
