import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

/**
 * Register a new user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<import('express').Response|void>}
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!req.user && role === "admin") {
      return res.status(403).json({
        success: false,
        data: null,
        message: "Admin accounts can only be created by an authenticated admin",
      });
    }
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, data: null, message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, COALESCE(name, '') AS name, email, COALESCE(role, 'staff') AS role",
      [name, email, passwordHash, role || "staff"]
    );

    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role }, process.env.JWT_SECRET, {
      expiresIn,
    });

    return res.status(201).json({
      success: true,
      data: { user: result.rows[0], token },
      message: "User registered",
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

/**
 * Authenticate a user and return a JWT token.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<import('express').Response|void>}
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result.rows.length) {
      return res.status(401).json({ success: false, data: null, message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, data: null, message: "Invalid credentials" });
    }

const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn });
    
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET || "refresh_secret_key_2024", {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
    });

    return res.json({
      success: true,
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token, refreshToken },
      message: "Login successful",
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

/**
 * Return the authenticated user profile.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<import('express').Response|void>}
 */
export const me = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const result = await query(
      "SELECT id, COALESCE(name, '') AS name, email, COALESCE(role, 'staff') AS role FROM users WHERE id = $1",
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "User not found" });
    }

    return res.json({ success: true, data: { user: result.rows[0] }, message: "User profile fetched" });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

/**
 * Refresh access token using refresh token.
 */
export const refreshToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const refreshTokenStr = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!refreshTokenStr) {
      return res.status(401).json({ success: false, data: null, message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshTokenStr, process.env.REFRESH_TOKEN_SECRET || "refresh_secret_key_2024");
    
    const result = await query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.id]);
    if (!result.rows.length) {
      return res.status(401).json({ success: false, data: null, message: "User not found" });
    }

    const user = result.rows[0];
    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    const newRefreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET || "refresh_secret_key_2024", {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    });

    return res.json({
      success: true,
      data: { user, accessToken, refreshToken: newRefreshToken },
      message: "Token refreshed",
    });
  } catch (error) {
    return res.status(401).json({ success: false, data: null, message: "Invalid refresh token" });
  }
};
