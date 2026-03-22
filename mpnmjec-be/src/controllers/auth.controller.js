import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import Faculty from "../models/Faculty.js";
import HOD from "../models/HOD.js";
import Student from "../models/Student.js";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

// 🔐 REGISTER (DISABLED - kept for reference, users are created by admin/superuser)
export const registerUser = async (req, res) => {
  try {
    let { name, username, email, password, role } = req.body;

    // Normalize inputs (NOT password - keep original case)
    name = typeof name === 'string' ? name.trim() : name;
    username = typeof username === 'string' ? username.toLowerCase().trim() : username;
    email = typeof email === 'string' ? email.toLowerCase().trim() : email;
    // Password is NOT converted - keep original case for security
    role = typeof role === 'string' ? role.toLowerCase() : role;

    if (!name || !(username || email) || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (role === 'student') {
      return res.status(403).json({ message: "Students are not allowed to self-register." });
    }

    // Accept either username or email for registration
    const query = email ? { email } : { username };
    const userExists = await User.findOne(query);
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email || undefined,
      username: username || undefined,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔑 LOGIN
export const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    // email field can be either email or username (lowercase for matching)
    const identifier = typeof email === 'string' ? email.toLowerCase().trim() : email;
    // Password is NOT converted - must match exactly as stored

    if (!identifier || !password)
      return res.status(400).json({ message: "Email/Username and password required" });  

    // Find user by email OR username
    const user = await User.findOne({ 
      $or: [
        { email: identifier }, 
        { username: identifier }
      ] 
    });

    
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is deactivated. Please contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Get additional user info based on role
    let additionalPayload = {};
    if (user.role === 'faculty') {
      const facultyProfile = await Faculty.findOne({ userId: user._id });
      if (facultyProfile) {
        additionalPayload.department = facultyProfile.department;
        additionalPayload.isClassAdvisor = facultyProfile.isClassAdvisor || false;
        additionalPayload.advisorFor = facultyProfile.advisorFor || null;
      }
    } else if (user.role === 'hod') {
      const hodProfile = await HOD.findOne({ userId: user._id });
      if (hodProfile) {
        additionalPayload.department = hodProfile.department;
      }
    } else if (user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: user._id });
      if (studentProfile) {
        additionalPayload.department = studentProfile.department;
      }
    }

    const accessToken = generateAccessToken(user, additionalPayload);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: additionalPayload.department || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const stored = await RefreshToken.findOne({ token });
    if (!stored) return res.status(403).json({ message: "Invalid refresh token" });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Get additional user info based on role for the new token
    let additionalPayload = {};
    if (user.role === 'faculty') {
      const facultyProfile = await Faculty.findOne({ userId: user._id });
      if (facultyProfile) {
        additionalPayload.department = facultyProfile.department;
        additionalPayload.isClassAdvisor = facultyProfile.isClassAdvisor || false;
        additionalPayload.advisorFor = facultyProfile.advisorFor || null;
      }
    } else if (user.role === 'hod') {
      const hodProfile = await HOD.findOne({ userId: user._id });
      if (hodProfile) {
        additionalPayload.department = hodProfile.department;
      }
    } else if (user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: user._id });
      if (studentProfile) {
        additionalPayload.department = studentProfile.department;
      }
    }

    const newAccessToken = generateAccessToken(user, additionalPayload);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token) await RefreshToken.deleteOne({ token });
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
