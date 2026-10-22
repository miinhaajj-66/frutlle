import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import supabase from '../config/supabase.js';
import generateToken from '../utils/generateToken.js';

const maskEmail = (str) => {
  if (!str || typeof str !== 'string' || !str.includes('@')) return 'unknown';
  const atIdx = str.lastIndexOf('@');
  const user = str.slice(0, atIdx);
  const domain = str.slice(atIdx + 1);
  return `${user.slice(0, 2)}***@${domain}`;
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      console.warn(`[AUTH] [${correlationId}] Login rejected: Missing email or password`);
      res.status(400);
      throw new Error('Please provide email and password');
    }

    const cleanEmail = email.trim();
    console.log(`[AUTH] [${correlationId}] Login attempt for email: ${maskEmail(cleanEmail)}`);

    // Case-insensitive lookup for user in public.users
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    // Check alias variations for admin if not found directly
    if (!user) {
      const lowerEmail = cleanEmail.toLowerCase();
      if (lowerEmail === 'admin@frutllejam.com' || lowerEmail === 'frutllejam@gmail.com') {
        const adminEnvEmail = (process.env.ADMIN_EMAIL || 'admin@frutllejam@gmail.com').trim();
        const { data: aliasUser } = await supabase
          .from('users')
          .select('*')
          .ilike('email', adminEnvEmail)
          .maybeSingle();
        if (aliasUser) {
          user = aliasUser;
        }
      }
    }

    if (error) {
      console.error(`[AUTH] [${correlationId}] Downstream Supabase error:`, error.message);
      res.status(503);
      throw new Error('Authentication service temporarily unavailable. Please try again.');
    }

    let passwordMatches = Boolean(user && user.password) && (await bcrypt.compare(password, user.password));

    // Fallback: Check if password was updated via Supabase Auth recovery
    if (!passwordMatches && user) {
      try {
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        const tempClient = createClient(process.env.SUPABASE_URL, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        const { data: sbAuth, error: sbErr } = await tempClient.auth.signInWithPassword({
          email: user.email,
          password
        });
        if (!sbErr && sbAuth?.user) {
          passwordMatches = true;
          // Synchronize new bcrypt password hash into public.users using admin client
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          const { error: syncError } = await supabase
            .from('users')
            .update({ password: hashedPassword, updated_at: new Date().toISOString() })
            .eq('id', user.id);
          if (syncError) {
            console.warn(`[AUTH] [${correlationId}] Notice syncing password hash:`, syncError.message);
          } else {
            console.log(`[AUTH] [${correlationId}] Password synchronized from Supabase Auth for user: ${user.id}`);
          }
        }
      } catch (sbCatch) {
        // Continue to regular invalid credentials check
      }
    }

    if (user && passwordMatches) {
      generateToken(res, user.id);
      console.log(`[AUTH] [${correlationId}] Login successful for user: ${user.id}, role: ${user.role}`);
      res.json({
        _id: user.id, // mapped for frontend compatibility
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      console.warn(`[AUTH] [${correlationId}] Login failed: Invalid email or password`);
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const { data: userExists } = await supabase.from('users').select('*').eq('email', email).maybeSingle();

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: user, error } = await supabase.from('users').insert([{
      name,
      email,
      password: hashedPassword,
      role: 'customer'
    }]).select().single();

    if (error) throw error;

    // Provision in Supabase Auth so password recovery emails work seamlessly
    try {
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      });
    } catch (authErr) {
      console.log('[AUTH] Supabase Auth creation note:', authErr.message);
    }

    if (user) {
      generateToken(res, user.id);
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user._id).single();

    if (error) throw error;

    if (user) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate with Supabase Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    const { accessToken } = req.body || {};
    
    if (!accessToken) {
      console.warn(`[AUTH] [${correlationId}] Google auth rejected: Missing access token`);
      res.status(400);
      throw new Error('Access token is required');
    }

    // Verify token directly with Supabase Auth
    const { data: { user: authUser }, error: verifyError } = await supabase.auth.getUser(accessToken);

    if (verifyError || !authUser) {
      console.warn(`[AUTH] [${correlationId}] Invalid Supabase token:`, verifyError?.message);
      res.status(401);
      throw new Error('Invalid or expired authentication token');
    }

    const email = authUser.email;
    if (!email) {
      res.status(400);
      throw new Error('No email address associated with this Google account');
    }

    console.log(`[AUTH] [${correlationId}] Supabase Google auth verified for: ${maskEmail(email)}`);

    // Check if user already exists in public.users table by email
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      console.error(`[AUTH] [${correlationId}] Database error checking existing user:`, findError.message);
      res.status(503);
      throw new Error('Authentication service temporarily unavailable');
    }

    let finalUser;

    if (existingUser) {
      console.log(`[AUTH] [${correlationId}] Existing user matched: ${existingUser.id}, role: ${existingUser.role}`);
      finalUser = existingUser;
      
      // Update name if currently empty or generic
      const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
      if (googleName && (!existingUser.name || existingUser.name === 'User' || existingUser.name === 'Social User')) {
        await supabase
          .from('users')
          .update({ name: googleName, updated_at: new Date() })
          .eq('id', existingUser.id);
        finalUser.name = googleName;
      }
    } else {
      // New user from Google OAuth
      // CRITICAL SECURITY: Always assign 'customer' role. Google login NEVER grants admin privileges automatically.
      const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0];
      const randomPassword = await bcrypt.hash(`oauth_google_${Date.now()}_${Math.random()}`, 10);
      
      console.log(`[AUTH] [${correlationId}] Creating new customer account for: ${maskEmail(email)}`);

      const newUserPayload = {
        name: googleName,
        email: email,
        password: randomPassword,
        role: 'customer' // STRICTLY CUSTOMER
      };
      
      // If authUser.id is a valid UUID, use it to maintain 1:1 parity with auth.users
      const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (authUser.id && validUuidRegex.test(authUser.id)) {
        newUserPayload.id = authUser.id;
      }

      const { data: createdUser, error: insertError } = await supabase
        .from('users')
        .insert([newUserPayload])
        .select()
        .single();

      if (insertError) {
        console.error(`[AUTH] [${correlationId}] Failed to create user record:`, insertError.message);
        res.status(500);
        throw new Error('Failed to create customer account');
      }

      finalUser = createdUser;
    }

    // Generate JWT cookie for Express backend session
    generateToken(res, finalUser.id);

    res.json({
      _id: finalUser.id,
      name: finalUser.name,
      email: finalUser.email,
      role: finalUser.role
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password in public.users after Supabase recovery
// @route   POST /api/auth/reset-password
// @access  Public (verified via Supabase recovery access token)
const resetUserPassword = async (req, res, next) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const { accessToken, newPassword } = req.body || {};
    if (!accessToken || !newPassword) {
      res.status(400);
      throw new Error('Access token and new password are required');
    }

    // Verify token directly with Supabase Auth
    const { data: { user: authUser }, error: verifyError } = await supabase.auth.getUser(accessToken);

    if (verifyError || !authUser || !authUser.email) {
      console.warn(`[AUTH] [${correlationId}] Invalid Supabase recovery token:`, verifyError?.message);
      res.status(401);
      throw new Error('Invalid or expired authentication token');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword, updated_at: new Date() })
      .eq('email', authUser.email);

    if (updateError) {
      console.error(`[AUTH] [${correlationId}] Failed to update user password:`, updateError.message);
      res.status(500);
      throw new Error('Failed to update password');
    }

    console.log(`[AUTH] [${correlationId}] Password updated successfully for user: ${maskEmail(authUser.email)}`);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export { loginUser, registerUser, logoutUser, getUserProfile, googleAuth, resetUserPassword };
