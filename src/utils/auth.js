// utils/auth.js
import Cookies from 'js-cookie';
import * as jose from 'jose';

// Create an encoder/decoder for JWT tokens
const textEncoder = new TextEncoder();

// This should be set in your environment variables and be a long, random string
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key'; 

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
    
    // Store in a cookie
    Cookies.set('auth_token', token, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Store user info in localStorage for easy access
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin
    }));
    
    return token;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const getSession = () => {
  try {
    // Get the token from cookies
    const token = Cookies.get('auth_token');
    
    if (!token) {
      return { session: null };
    }
    
    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user) {
      return { session: null };
    }
    
    // In a production app, you might want to verify the token here
    // For now, we'll just check if it exists
    
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

export const signOut = () => {
  Cookies.remove('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};