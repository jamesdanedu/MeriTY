import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';
import { createSession, getSession } from '@/utils/auth';
import { verifyPassword } from '@/utils/password';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Login() {
  const router = useRouter();
  const { redirectTo, message } = router.query;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Function to check if browser storage is available
  function checkStorageAccess() {
    let cookiesEnabled = false;
    let localStorageEnabled = false;
    
    // Check cookies
    try {
      document.cookie = "testcookie=1; path=/";
      cookiesEnabled = document.cookie.indexOf("testcookie") !== -1;
    } catch (e) {
      console.error("Cookie test failed:", e);
    }
    
    // Check localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      localStorageEnabled = true;
    } catch (e) {
      console.error("LocalStorage test failed:", e);
    }
    
    console.log("Storage access check:", { 
      cookiesEnabled, 
      localStorageEnabled 
    });
    
    return { cookiesEnabled, localStorageEnabled };
  }

  useEffect(() => {
    // Check browser storage access - MOVED INTO useEffect
    const { cookiesEnabled, localStorageEnabled } = checkStorageAccess();
    
    if (!cookiesEnabled || !localStorageEnabled) {
      setError("Your browser settings are preventing login. Please enable cookies and local storage access.");
      return;
    }
    
    // Check if user is already logged in
    async function checkSession() {
      const { session } = await getSession();
      if (session) {
        // Redirect to dashboard or the originally requested page
        router.push(redirectTo || '/dashboard');
      }
    }
    
    checkSession();
    
    // Show success message if password was changed
    if (message === 'password_changed') {
      setSuccessMessage('Your password has been changed successfully. Please sign in with your new password.');
    }
  }, [redirectTo, router, message]); // Added message to dependencies

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setDebugInfo(null);
    
    try {
      // Fetch the teacher record first
      const { data: teacher, error: teacherFetchError } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', email)
        .single();
      
      // Detailed debug logging
      console.log('Teacher Record:', teacher);
      console.log('Teacher Fetch Error:', teacherFetchError);
  
      if (teacherFetchError) {
        throw new Error('Unable to find teacher account');
      }
  
      if (!teacher) {
        throw new Error('No teacher account found with this email');
      }
  
      // Check account status
      if (!teacher.is_active) {
        throw new Error('This account has been deactivated');
      }
  
      // Check if the password properties exist
      if (!teacher.password_hash || !teacher.password_salt) {
        console.error('Missing password hash or salt:', {
          hash: !!teacher.password_hash,
          salt: !!teacher.password_salt
        });
        throw new Error('Account setup incomplete. Please contact an administrator.');
      }
  
      // Verify password using custom password utility
      const passwordValid = verifyPassword(
        password, 
        teacher.password_hash, 
        teacher.password_salt
      );
  
      // Detailed debug logging
      console.log('Password Verification Result:', passwordValid);
  
      if (!passwordValid) {
        throw new Error('Invalid password');
      }
  
      // Check if user needs to change password
      if (teacher.must_change_password || teacher.password_changed === false) {
        console.log('User needs to change password, redirecting...');
        
        // Create a session with JWT token
        const sessionToken = await createSession(teacher);
        console.log('Session token created, length:', sessionToken?.length);
        
        // Update last login timestamp
        await supabase
          .from('teachers')
          .update({ 
            last_login: new Date().toISOString() 
          })
          .eq('email', email);
        
        // Redirect to change password page instead of dashboard
        window.location.href = '/change-password?forced=true';
        return; // Stop execution here
      }
  
      // If no password change needed, continue normal login flow
      // Create a session with JWT token
      const sessionToken = await createSession(teacher);
      console.log('Session token created, length:', sessionToken?.length);
      
      // Double-check if cookie was set
      console.log('Cookie present after creation:', document.cookie.includes('auth_token'));
  
      // Update last login timestamp
      await supabase
        .from('teachers')
        .update({ 
          last_login: new Date().toISOString() 
        })
        .eq('email', email);
  
      console.log('Redirecting to dashboard...');
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
  
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      setDebugInfo(JSON.stringify({
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        borderRadius: '0.5rem',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* School Logo Placeholder */}
          <div style={{ 
               width: '100px', 
               height: '100px', 
               margin: '0 auto',
              marginBottom: '1.5rem' 
      }}>
        <img
          src="/public/schoollogo.png"
          alt="School Logo"
          style={{width: '100%',   height: '100%', objectFit: 'contain' 
        }}
  />
</div>
          
          <h1 style={{ 
            fontSe: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            MeriTY Credits Manager
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Sign in to your account</p>
        </div>
        
        {error && (
          <div style={{
            borderRadius: '0.375rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div style={{
            borderRadius: '0.375rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {successMessage}
          </div>
        )}
        
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <pre style={{
            backgroundColor: '#f3f4f6',
            padding: '1rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            overflowX: 'auto'
          }}>
            {debugInfo}
          </pre>
        )}
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="email" 
              style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.15s ease-in-out',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease-in-out',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#6b7280'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%',
                backgroundColor: '#4f46e5',
                color: 'white',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.15s ease-in-out',
                fontSize: '0.875rem',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '2.5rem'
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div style={{ 
            marginTop: '1rem', 
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <a 
              href="/reset-password" 
              style={{
                color: '#4f46e5',
                textDecoration: 'none'
              }}
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
