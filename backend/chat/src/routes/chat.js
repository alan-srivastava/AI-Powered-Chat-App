import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { createNewChat, getAllChats } from "../controllers/chat.js";
import { upload } from "../middlewares/multer.js";
import { sendMessage, getMessagesByChat } from "../controllers/chat.js";

const router= express.Router();

router.post("/chat/new", isAuth, createNewChat);
router.get("/chat/all", isAuth, getAllChats);
router.post("/message", isAuth, upload.single('image'), sendMessage);
router.get("/message/:chatId", isAuth, getMessagesByChat);

export default router;
