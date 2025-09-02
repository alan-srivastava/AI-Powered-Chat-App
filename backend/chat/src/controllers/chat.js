import TryCatch from "../config/TryCatch.js";
import Chat from "../models/Chat.js";
import Messages from "../models/Messages.js";
import axios from "axios";

export const createNewChat = TryCatch(async (req, res) => {
    const userId = req.user?._id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
        return res.status(400).json({
            success: false,
            message: "otherUserId is required",
        });
    }

    const existingChat = await Chat.findOne({
        users: { $all: [userId, otherUserId], $size: 2 },
    });

    if (existingChat) {
        return res.status(200).json({
            success: true,
            message: "Chat already exists",
            chat: {
                id: existingChat._id,
                users: existingChat.users,
                createdAt: existingChat.createdAt,
                updatedAt: existingChat.updatedAt,
            },
        });
    }

    const newChat = await Chat.create({
        users: [userId, otherUserId],
    });

    res.status(201).json({
        success: true,
        message: "New chat created",
        chat: {
            id: newChat._id,
            users: newChat.users,
            createdAt: newChat.createdAt,
            updatedAt: newChat.updatedAt,
        },
    });
});

export const getAllChats = TryCatch(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "UserId missing",
        });
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
                        id: chat._id,
                        users: chat.users,
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                        createdAt: chat.createdAt,
                        updatedAt: chat.updatedAt,
                    },
                };
            } catch (error) {
                console.log(error);
                return {
                    user: { _id: otherUserId, name: "Unknown User" },
                    chat: {
                        id: chat._id,
                        users: chat.users,
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                        createdAt: chat.createdAt,
                        updatedAt: chat.updatedAt,
                    },
                };
            }
        })
    );

    res.json({
        success: true,
        totalChats: chatWithUserData.length,
        chats: chatWithUserData,
    });
});

export const sendMessage = TryCatch(async (req, res) => {
    const senderId = req.user?._id;
    const { chatId, text } = req.body;
    const imageFile = req.file;

    if (!senderId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized user",
        });
    }
    if (!chatId) {
        return res.status(400).json({
            success: false,
            message: "ChatId Required",
        });
    }
    if (!text && !imageFile) {
        return res.status(400).json({
            success: false,
            message: "Either text or image is required",
        });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return res.status(404).json({
            success: false,
            message: "Chat not found",
        });
    }

    const isUserInChat = chat.users.some(
        (userId) => userId.toString() === senderId.toString()
    );
    if (!isUserInChat) {
        return res.status(403).json({
            success: false,
            message: "You are not a participant of this chat",
        });
    }

    const otherUserId = chat.users.find(
        (userId) => userId.toString() !== senderId.toString()
    );

    if (!otherUserId) {
        return res.status(401).json({
            success: false,
            message: "No other user",
        });
    }

    // message payload
    let messageData = {
        chatId,
        sender: senderId,
        seen: false,
        seenAt: undefined,
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

    const latestMessageText = imageFile ? "📸 Image" : text;

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

    res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: {
            id: savedMessage._id,
            chatId: savedMessage.chatId,
            sender: savedMessage.sender,
            text: savedMessage.text,
            type: savedMessage.messageType,
            seen: savedMessage.seen,
            createdAt: savedMessage.createdAt,
        },
    });
});

export const getMessagesByChat = TryCatch(async (req, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    if (!chatId) {
        return res.status(400).json({
            success: false,
            message: "ChatId Required",
        });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return res.status(404).json({
            success: false,
            message: "Chat not found",
        });
    }

    const isUserInChat = chat.users.some(
        (id) => id.toString() === userId.toString()
    );
    if (!isUserInChat) {
        return res.status(403).json({
            success: false,
            message: "You are not a participant of this chat",
        });
    }

    const messages = await Messages.find({ chatId }).sort({ createdAt: 1 });

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

    const otherUserId = chat.users.find((id) => id.toString() !== userId.toString());

    try {
        const { data } = await axios.get(
            `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
        );

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: "No other user",
            });
        }

        res.status(200).json({
            success: true,
            chatId,
            totalMessages: messages.length,
            user: data,
            messages: messages.map((msg) => ({
                id: msg._id,
                sender: msg.sender,
                text: msg.text,
                type: msg.messageType,
                seen: msg.seen,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
            })),
        });
    } catch (error) {
        console.log(error);
        res.status(200).json({
            success: true,
            chatId,
            totalMessages: messages.length,
            user: { _id: otherUserId, name: "Unknown User" },
            messages: messages.map((msg) => ({
                id: msg._id,
                sender: msg.sender,
                text: msg.text,
                type: msg.messageType,
                seen: msg.seen,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
            })),
        });
    }
});
