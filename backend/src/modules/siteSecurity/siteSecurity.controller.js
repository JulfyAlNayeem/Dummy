

import jwt from "jsonwebtoken";
import SiteSecurityMessage from "./models/siteSecurityMessageModel.js";


// JWT secret just for signing — keep this in .env
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,          // HTTP, not HTTPS
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// ─── Admin: Create security message ──────────────────────────────────────────
export const createSiteSecurityMessage = async (req, res) => {
  try {
    const { goodMessage, badMessage } = req.body;

    if (!goodMessage || !badMessage) {
      return res.status(400).json({
        success: false,
        message: "Both goodMessage and badMessage are required",
      });
    }

    const newMessage = new SiteSecurityMessage({ goodMessage, badMessage });
    const savedMessage = await newMessage.save();

    res.status(201).json({
      success: true,
      message: "Site security message created successfully",
      data: savedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating site security message",
      error: error.message,
    });
  }
};

// ─── User: Verify pin ─────────────────────────────────────────────────────────
export const verifySiteSecurityMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required for verification",
      });
    }

    // Always pull the latest record from DB (admin controls this)
    const record = await SiteSecurityMessage.findOne().sort({ createdAt: -1 });

    let matched = false;
    let messageType = null;

    if (record) {
      if (record.goodMessage === message) {
        matched = true;
        messageType = "good";
      } else if (record.badMessage === message) {
        matched = true;
        messageType = "bad";
      }
    } else {
      // No DB record yet — use seed defaults as fallback
      const normalized = message.toLowerCase().trim();
      if (normalized === "assalam") {
        matched = true;
        messageType = "good";
      } else if (normalized === "goodmorning") {
        matched = true;
        messageType = "bad";
      }
    }

    if (!matched) {
      return res.status(401).json({
        success: false,
        message: "Invalid pin. Please try again.",
      });
    }

    // Sign token and set cookie
    const token = jwt.sign({ verified: true }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("site_verified", token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Security Pin verified successfully",
      data: {
        messageType,
        verifiedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Verify site security error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying security Pin",
      error: error.message,
    });
  }
};

// ─── Check if already verified (reads cookie) ────────────────────────────────
export const checkSiteVerification = async (req, res) => {
  try {
    const token = req.cookies?.site_verified;

    if (!token) {
      return res.status(200).json({ verified: false });
    }

    jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ verified: true });

  } catch {
    // Expired or tampered token
    res.clearCookie("site_verified");
    return res.status(200).json({ verified: false });
  }
};


// Get site security messages
export const getSiteSecurityMessages = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      // Fetch specific message by ID
      const message = await SiteSecurityMessage.findById(id);
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Site security message not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Site security message retrieved successfully',
        data: {
          id: message._id,
          goodMessage: message.goodMessage,
          badMessage: message.badMessage,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        }
      });
    }

    // Fetch all messages if no ID is provided
    const messages = await SiteSecurityMessage.find();

    res.status(200).json({
      success: true,
      message: 'Site security messages retrieved successfully',
      data: messages.map(msg => ({
        id: msg._id,
        goodMessage: msg.goodMessage,
        badMessage: msg.badMessage,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving site security messages',
      error: error.message
    });
  }
};