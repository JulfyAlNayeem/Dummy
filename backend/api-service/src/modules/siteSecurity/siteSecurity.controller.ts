import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database.js';

const SITE_SECURITY_SECRET = process.env.SITE_SECURITY_SECRET || process.env.ACCESS_TOKEN_SECRET!;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // site runs on HTTP, not HTTPS
  sameSite: 'lax' as 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

export const createSiteSecurityMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goodMessage, badMessage } = req.body;

    if (!goodMessage || !badMessage) {
      res.status(400).json({ success: false, message: 'Both goodMessage and badMessage are required' });
      return;
    }

    const record = await prisma.siteSecurityMessage.create({
      data: { goodMessage, badMessage },
    });

    res.status(201).json({
      success: true,
      message: 'Site security message created successfully',
      data: record
    });
  } catch (error: any) {
    console.error('Create site security message error:', error);
    res.status(500).json({ message: 'Failed to create site security message.', error: error.message });
  }
};

export const verifySiteSecurityMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required for verification' });
      return;
    }

    const record = await prisma.siteSecurityMessage.findFirst({
      where: {
        OR: [
          { goodMessage: message },
          { badMessage: message },
        ],
      },
    });

    if (record) {
      if (record.goodMessage === message) {
        const token = jwt.sign({ verified: true }, SITE_SECURITY_SECRET, { expiresIn: '1d' });
        res.cookie('site_verified', token, COOKIE_OPTIONS);
        res.status(200).json({
          success: true,
          message: 'Security Pin verified successfully',
          data: { id: record.id, verifiedAt: new Date() }
        });
        return;
      }
      if (record.badMessage === message) {
        const token = jwt.sign({ verified: true }, SITE_SECURITY_SECRET, { expiresIn: '1d' });
        res.cookie('site_verified', token, COOKIE_OPTIONS);
        res.status(200).json({
          success: true,
          message: 'Security Pin verified successfully',
          data: { id: record.id, verifiedAt: new Date() }
        });
        return;
      }
    }

    // Default fallback messages (matching old behavior)
    const normalizedMessage = message.toLowerCase().trim();
    if (normalizedMessage === 'assalam') {
      const token = jwt.sign({ verified: true }, SITE_SECURITY_SECRET, { expiresIn: '1d' });
      res.cookie('site_verified', token, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        message: 'Security Pin verified successfully',
        data: { messageType: 'good', verifiedAt: new Date(), isDefault: true }
      });
      return;
    }
    if (normalizedMessage === 'goodmorning') {
      const token = jwt.sign({ verified: true }, SITE_SECURITY_SECRET, { expiresIn: '1d' });
      res.cookie('site_verified', token, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        message: 'Security Pin verified successfully',
        data: { messageType: 'bad', verifiedAt: new Date(), isDefault: true }
      });
      return;
    }

    res.status(401).json({ success: false, message: "Invalid pin. Please enter 'valid pin'." });
  } catch (error: any) {
    console.error('Verify site security message error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify site security message.', error: error.message });
  }
};

export const getSiteSecurityMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.query;

    if (id) {
      const record = await prisma.siteSecurityMessage.findUnique({
        where: { id: id as string },
      });

      if (!record) {
        res.status(404).json({ message: 'Site security message not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Site security message retrieved successfully',
        data: {
          id: record.id,
          goodMessage: record.goodMessage,
          badMessage: record.badMessage,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
      return;
    }

    const records = await prisma.siteSecurityMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      message: 'Site security messages retrieved successfully',
      data: records.map((record: any) => ({
        id: record.id,
        goodMessage: record.goodMessage,
        badMessage: record.badMessage,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get site security messages error:', error);
    res.status(500).json({ message: 'Failed to get site security messages.', error: error.message });
  }
};

export const checkSiteVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.site_verified;
    if (!token) {
      res.status(401).json({ verified: false, message: 'Not verified' });
      return;
    }
    jwt.verify(token, SITE_SECURITY_SECRET);
    res.status(200).json({ verified: true });
  } catch {
    res.status(401).json({ verified: false, message: 'Verification expired or invalid' });
  }
};
