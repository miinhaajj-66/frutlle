import supabase from '../config/supabase.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const FALLBACK_FILE = path.join(DATA_DIR, 'contact_messages.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[MESSAGE CONTROLLER] Could not create data directory:', err.message);
  }
}

// In-memory fallback messages store
let fallbackMessages = [];

// Helper to load fallback messages from disk
const loadFallbackMessages = () => {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const content = fs.readFileSync(FALLBACK_FILE, 'utf8');
      fallbackMessages = JSON.parse(content);
    }
  } catch (err) {
    console.warn('[MESSAGE CONTROLLER] Error loading fallback messages from disk:', err.message);
    fallbackMessages = [];
  }
};

// Helper to save fallback messages to disk
const saveFallbackMessages = () => {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackMessages, null, 2), 'utf8');
  } catch (err) {
    console.warn('[MESSAGE CONTROLLER] Error saving fallback messages to disk:', err.message);
  }
};

loadFallbackMessages();

// Rate limiting map (IP -> timestamps array)
const submissionRateMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 5;

const isRateLimited = (clientIp) => {
  const now = Date.now();
  const timestamps = (submissionRateMap.get(clientIp) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return true;
  }
  timestamps.push(now);
  submissionRateMap.set(clientIp, timestamps);
  return false;
};

// Email validation regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// @desc    Submit a new contact message
// @route   POST /api/messages
// @access  Public
export const submitContactMessage = async (req, res, next) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (isRateLimited(clientIp)) {
      res.status(429);
      throw new Error('Too many messages sent. Please wait a few minutes before submitting again.');
    }

    const { name, email, subject, message } = req.body;

    // Strict server-side validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400);
      throw new Error('Name must be at least 2 characters.');
    }
    if (name.trim().length > 150) {
      res.status(400);
      throw new Error('Name cannot exceed 150 characters.');
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400);
      throw new Error('Please provide a valid email address.');
    }
    if (email.trim().length > 255) {
      res.status(400);
      throw new Error('Email cannot exceed 255 characters.');
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 2) {
      res.status(400);
      throw new Error('Subject must be at least 2 characters.');
    }
    if (subject.trim().length > 200) {
      res.status(400);
      throw new Error('Subject cannot exceed 200 characters.');
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      res.status(400);
      throw new Error('Message must be at least 5 characters.');
    }
    if (message.trim().length > 5000) {
      res.status(400);
      throw new Error('Message cannot exceed 5000 characters.');
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      is_read: false
    };

    // Attempt to persist to Supabase contact_messages table
    const { data, error } = await supabase
      .from('contact_messages')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // If table is not yet created in Supabase (PGRST205), seamlessly fall back
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        const fallbackRecord = {
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        fallbackMessages.unshift(fallbackRecord);
        saveFallbackMessages();

        return res.status(201).json({
          success: true,
          message: 'Thank you! Your message has been sent successfully.',
          data: fallbackRecord
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact messages (with search, filter, and unread count)
// @route   GET /api/messages
// @access  Private/Admin
export const getContactMessages = async (req, res, next) => {
  try {
    const { search = '', filter = 'all' } = req.query;

    const { data: dbMessages, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    let messages = [];

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        messages = [...fallbackMessages];
      } else {
        throw error;
      }
    } else {
      messages = dbMessages || [];
    }

    // Calculate unread count across all messages
    const unreadCount = messages.filter((m) => !m.is_read).length;

    // Apply search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      messages = messages.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.subject && m.subject.toLowerCase().includes(q)) ||
          (m.message && m.message.toLowerCase().includes(q))
      );
    }

    // Apply status filter
    if (filter === 'unread') {
      messages = messages.filter((m) => !m.is_read);
    } else if (filter === 'read') {
      messages = messages.filter((m) => m.is_read);
    }

    res.json({
      success: true,
      count: messages.length,
      unreadCount,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread contact messages count
// @route   GET /api/messages/unread-count
// @access  Private/Admin
export const getUnreadCount = async (req, res, next) => {
  try {
    const { data, count, error } = await supabase
      .from('contact_messages')
      .select('id', { count: 'exact' })
      .eq('is_read', false);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        const unreadCount = fallbackMessages.filter((m) => !m.is_read).length;
        return res.json({ unreadCount });
      }
      throw error;
    }

    const unreadCount = count !== null && count !== undefined ? count : (data?.length || 0);
    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single contact message by ID
// @route   GET /api/messages/:id
// @access  Private/Admin
export const getContactMessageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        const found = fallbackMessages.find((m) => m.id === id);
        if (!found) {
          res.status(404);
          throw new Error('Message not found');
        }
        return res.json({ success: true, message: found });
      }
      throw error;
    }

    if (!data) {
      res.status(404);
      throw new Error('Message not found');
    }

    res.json({ success: true, message: data });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle or set read status of a message
// @route   PUT /api/messages/:id/read
// @access  Private/Admin
export const updateMessageReadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    const newStatus = typeof isRead === 'boolean' ? isRead : true;

    const { data, error } = await supabase
      .from('contact_messages')
      .update({
        is_read: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        const index = fallbackMessages.findIndex((m) => m.id === id);
        if (index === -1) {
          res.status(404);
          throw new Error('Message not found');
        }
        fallbackMessages[index].is_read = newStatus;
        fallbackMessages[index].updated_at = new Date().toISOString();
        saveFallbackMessages();
        return res.json({ success: true, message: fallbackMessages[index] });
      }
      throw error;
    }

    if (!data) {
      res.status(404);
      throw new Error('Message not found');
    }

    res.json({ success: true, message: data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a contact message
// @route   DELETE /api/messages/:id
// @access  Private/Admin
export const deleteContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        const initialLen = fallbackMessages.length;
        fallbackMessages = fallbackMessages.filter((m) => m.id !== id);
        if (fallbackMessages.length === initialLen) {
          res.status(404);
          throw new Error('Message not found');
        }
        saveFallbackMessages();
        return res.json({ success: true, message: 'Message deleted successfully.' });
      }
      throw error;
    }

    res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
