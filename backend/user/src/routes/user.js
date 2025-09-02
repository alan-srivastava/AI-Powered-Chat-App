import express from "express";
import { loginUser, verifyUser, myProfile, getAllUsers, getAUser, updateName } from "../controllers/user.js"; // ✅ myProfile comes from controllers
import { isAuth } from "../middleware/isAuth.js"; // ✅ only isAuth comes from middleware


const router = express.Router();
router.post("/login", loginUser);
router.post("/verify", verifyUser);
router.get("/me", isAuth, myProfile);
router.get("/user/all", isAuth, getAllUsers);
router.get("/user/:id", getAUser);
router.post("/update/user", isAuth, updateName);


export default router;