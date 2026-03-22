import jwt from "jsonwebtoken";

export const generateAccessToken = (user, additionalPayload = {}) =>
  jwt.sign(
    { 
      id: user._id, 
      role: user.role,
      name: user.name,
      ...additionalPayload
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

export const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);