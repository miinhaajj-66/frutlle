import jwt from 'jsonwebtoken';

/**
 * Returns consistent cookie options for setting and clearing the auth token.
 * Ensures the SameSite, Secure, HttpOnly, and Path attributes match across environments.
 */
export const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
};

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  // Set JWT as HTTP-Only cookie with matching options
  res.cookie('jwt', token, {
    ...getAuthCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export default generateToken;
