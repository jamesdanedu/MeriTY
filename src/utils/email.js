// src/utils/auth.js
import Cookies from 'js-cookie';
import * as jose from 'jose';

// Create a consistent encoder for JWT tokens
const textEncoder = new TextEncoder();

// Use a consistent secret key
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback-secret-key-for-development-only';

export const createSession = async (user) => {
  try {
    // Create the JWT token
    const secretKey = textEncoder.encode(JWT_SECRET);
    
    const token = await new jose.SignJWT({
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);
    
    // Store in a cookie with proper attributes
    Cookies.set('auth_token', token, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' // Changed from 'strict' to allow redirects
    });
    
    // Store user info in localStorage for easy access
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin
    }));
    
    return true;
  } catch (error) {
    console.error('Error creating session:', error);
    return false;
  }
};

export const getSession = () => {
  try {
    // Get the token from cookies
    const token = Cookies.get('auth_token');
    
    if (!token) {
      console.log("No auth token found");
      return { session: null };
    }
    
    // Get user data from localStorage
    let user;
    try {
      user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
      user = null;
    }
    
    if (!user || !user.email) {  // Check specifically for email property
      console.log("Invalid user data found in localStorage");
      Cookies.remove('auth_token'); // Clean up the token if user data is missing or invalid
      localStorage.removeItem('user');
      return { session: null };
    }
    
    return {
      session: {
        user
      }
    };
  } catch (error) {
    console.error('Error getting session:', error);
    // Clean up on error
    Cookies.remove('auth_token');
    localStorage.removeItem('user');
    return { session: null };
  }
};

export const signOut = () => {
  // Clear everything related to auth
  Cookies.remove('auth_token');
  localStorage.removeItem('user');
  
  // Force a proper logout by navigating to the login page with a timestamp
  // to avoid browser cache issues
  window.location.href = `/login?t=${Date.now()}`;
};

