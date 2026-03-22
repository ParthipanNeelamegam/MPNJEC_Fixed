import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Helper: Generate random password (8 alphanumeric characters)
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ========================
// ADMIN MANAGEMENT (SuperUser Only)
// ========================

// POST /api/superuser/admin - Create Admin
export const createAdmin = async (req, res) => {
  try {
    let { name, email, username } = req.body;

    // Normalize inputs
    name = name?.trim();
    email = email?.toLowerCase().trim();
    username = username?.toLowerCase().trim();

    // Validate required fields
    if (!name || (!email && !username)) {
      return res.status(400).json({ error: "Name and (email or username) are required" });
    }

    // Check if email already exists
    if (email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }

    // Check if username already exists
    if (username) {
      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
    }

    // Generate password
    const generatedPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create Admin User
    const admin = await User.create({
      name,
      email: email || undefined,
      username: username || email?.split('@')[0],
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        isActive: admin.isActive,
      },
      credentials: {
        username: admin.username || admin.email,
        password: generatedPassword, // Plain password returned only once
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({ error: error.message || "Failed to create admin" });
  }
};

// GET /api/superuser/admins - Get All Admins
export const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password");
    
    res.json({
      success: true,
      admins: admins.map(a => ({
        id: a._id,
        name: a.name,
        email: a.email,
        username: a.username,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch admins" });
  }
};

// PUT /api/superuser/admin/:id - Update Admin
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    if (admin.role !== "admin") {
      return res.status(400).json({ error: "User is not an admin" });
    }

    // Update fields
    if (name) admin.name = name.trim();
    if (email) admin.email = email.toLowerCase().trim();
    if (typeof isActive === "boolean") admin.isActive = isActive;

    await admin.save();

    res.json({
      success: true,
      message: "Admin updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error("Update admin error:", error);
    res.status(500).json({ error: error.message || "Failed to update admin" });
  }
};

// DELETE /api/superuser/admin/:id - Delete Admin
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    if (admin.role !== "admin") {
      return res.status(400).json({ error: "User is not an admin" });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({ error: error.message || "Failed to delete admin" });
  }
};

// POST /api/superuser/admin/:id/reset-password - Reset Admin Password
export const resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    if (admin.role !== "admin") {
      return res.status(400).json({ error: "User is not an admin" });
    }

    // Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({
      success: true,
      message: "Password reset successfully",
      credentials: {
        username: admin.username || admin.email,
        password: newPassword, // Plain password returned only once
      },
    });
  } catch (error) {
    console.error("Reset admin password error:", error);
    res.status(500).json({ error: error.message || "Failed to reset password" });
  }
};
