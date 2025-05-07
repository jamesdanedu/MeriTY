// src/utils/auth.js
import Cookies from 'js-cookie';
import { jwtVerify, SignJWT } from 'jose';

// This should be set in your environment variables and be a long, random string
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key-should-be-at-least-32-chars';
const JWT_EXPIRY = process.env.NEXT_PUBLIC_JWT_EXPIRY || '12h'; // Token expiry

// Convert string to Uint8Array for jose library
const getSecretKey = () => {
  return new TextEncoder().encode(JWT_SECRET);
};

export const createSession = async (userData) => {
  try {
    // Validate input
    if (!userData) {
      console.error('No user data provided for session creation');
      throw new Error('Invalid user data');
    }

    // Ensure we have a valid secret key
    const secretKey = getSecretKey();
    if (!secretKey || secretKey.length === 0) {
      console.error('Invalid secret key for JWT signing');
      throw new Error('Cannot create session: Invalid secret key');
    }

    // Create JWT token
    const token = await new SignJWT({ 
      userId: userData.id,
      email: userData.email,
      name: userData.name,
      isAdmin: userData.is_admin || false,
      role: userData.role || 'user'
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(JWT_EXPIRY)
    .sign(secretKey);

    // Validate token creation
    if (!token) {
      console.error('Token creation failed');
      throw new Error('Failed to generate authentication token');
    }

    // Set token in cookies
    Cookies.set('auth_token', token, { 
      expires: parseJWTExpiry(JWT_EXPIRY), 
      path: '/',
      // In production, consider adding:
      // secure: process.env.NODE_ENV === 'production',
      // httpOnly: true
    });

    // Store user data in localStorage
    // Be careful about storing sensitive information
    localStorage.setItem('user', JSON.stringify({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      isAdmin: userData.is_admin || false,
      role: userData.role || 'user'
    }));

    console.log('Session created successfully');
    return token;
  } catch (error) {
    console.error('Detailed session creation error:', {
      message: error.message,
      stack: error.stack,
      userData: userData ? Object.keys(userData) : 'No user data'
    });
    throw error;
  }
};

// Utility function to parse JWT expiry
function parseJWTExpiry(expiry) {
  const match = expiry.match(/^(\d+)([hdms])$/);
  if (!match) return 1; // default to 1 day if parsing fails

  const [, value, unit] = match;
  switch(unit) {
    case 'h': return value / 24; // convert hours to days for Cookies.set
    case 'd': return Number(value);
    case 'm': return value / (24 * 60); // convert minutes to days
    case 's': return value / (24 * 60 * 60); // convert seconds to days
    default: return 1;
  }
}

export const getSession = () => {
  try {
    // Log the entire cookie string for debugging
    console.log('All cookies:', document.cookie);
    
    // Get the token from cookies
    const token = Cookies.get('auth_token');
    console.log('Auth token exists:', !!token);
    
    if (!token) {
      console.log('No auth_token cookie found');
      return { session: null };
    }
    
    try {
      // Verify token (basic check)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Token format is invalid');
        return { session: null };
      }
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return { session: null };
    }
    
    // Get user data from localStorage
    let user = null;
    try {
      const userStr = localStorage.getItem('user');
      console.log('User data exists in localStorage:', !!userStr);
      user = userStr ? JSON.parse(userStr) : null;
    } catch (storageError) {
      console.error('Error reading from localStorage:', storageError);
    }
    
    if (!user) {
      console.log('No user data found in localStorage');
      return { session: null };
    }
    
    return {
      session: {
        user
      }
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return { session: null };
  }
};

export const refreshSession = async () => {
  const { session } = await getSession();
  
  if (!session) {
    return { session: null };
  }
  
  // Get fresh user data from database
  // This would typically be a server-side API call
  // Here we're just extending the token expiry
  
  return createSession(session.user);
};

export const signOut = () => {
  Cookies.remove('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Check if user has admin role
export const isAdmin = async () => {
  const { session } = await getSession();
  return session?.user?.isAdmin === true;
};

// Utility function to get current user
export const getCurrentUser = async () => {
  const { session } = await getSession();
  return session?.user || null;
};