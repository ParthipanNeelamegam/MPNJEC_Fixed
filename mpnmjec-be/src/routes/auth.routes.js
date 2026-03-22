import express from "express";
import {
  // registerUser, // DISABLED: Public registration is not allowed
  loginUser,
  refreshToken,
  logoutUser,
} from "../controllers/auth.controller.js";

const router = express.Router()


// DISABLED: Public registration - Users must be created by Admin or Super User
// router.post("/register", registerUser);

router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logoutUser);

export default router
