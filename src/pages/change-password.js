import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { getSession } from '@/utils/auth';
import { generateSalt, hashPassword } from '@/utils/password';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ChangePassword() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState(null);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  
  useEffect(() => {
    async function checkAuth() {
      try {
        // Check authentication
        const { session } = await getSession();
        
        if (!session) {
          window.location.href = '/login';
          return;
        }

        // Get teacher data
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (teacherError) {
          throw teacherError;
        }
        
        // If user doesn't need to change password and it's a forced change, redirect to dashboard
        const forced = router.query.forced === 'true';
        if (forced && !teacher.must_change_password && teacher.password_changed !== false) {
          window.location.href = '/dashboard';
          return;
        }
        
        setTeacherId(teacher.id);
        setTeacherEmail(teacher.email);
        setTokenValid(true);
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    checkAuth();
  }, [router.query.forced]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    // Simple password validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setSaving(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setSaving(false);
      return;
    }
    
    try {
      const salt = generateSalt();
      const hashedPassword = await hashPassword(newPassword, salt);
      
      const { error } = await supabase
        .from('teachers')
        .update({
          password_hash: hashedPassword,
          password_salt: salt,
          must_change_password: false,
          password_changed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', teacherId);
        
      if (error) throw error;
      
      // Redirect based on whether it was forced or not
      if (router.query.forced === 'true') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login?message=password_changed';
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.message || 'An error occurred while changing your password');
      setSaving(false);
    }
  };
  
  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (loading) {
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
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Validating...
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Please wait while we validate your request</p>
        </div>
      </div>
    );
  }

  if (!tokenValid && !loading) {
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
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error || 'Invalid or expired token'}
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{ 
              backgroundColor: '#4f46e5',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

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
          {/* School Logo or Icon */}
          <div style={{ 
            width: '70px', 
            height: '70px', 
            margin: '0 auto',
            backgroundColor: '#e5e7eb',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <Lock size={30} color="#4f46e5" />
          </div>
          
          <h1 style={{ 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Change Your Password
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Please set a new password for your account
          </p>
          {teacherEmail && (
            <p style={{ 
              color: '#4f46e5', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginTop: '0.5rem'
            }}>
              {teacherEmail}
            </p>
          )}
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
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <label 
              htmlFor="newPassword" 
              style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}
            >
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                onClick={toggleNewPasswordVisibility}
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
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginTop: '0.25rem' 
            }}>
              Passwords must be at least 8 characters long
            </p>
          </div>
          
          <div style={{ marginBottom: '2rem', position: 'relative' }}>
            <label 
              htmlFor="confirmPassword" 
              style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}
            >
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onClick={toggleConfirmPasswordVisibility}
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
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              style={{ 
                width: '100%',
                backgroundColor: '#4f46e5',
                color: 'white',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'background-color 0.15s ease-in-out',
                fontSize: '0.875rem',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '2.5rem'
              }}
            >
              {saving ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
          
          <div style={{ 
            marginTop: '1rem', 
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <a 
              href="/login" 
              style={{
                color: '#4f46e5',
                textDecoration: 'none'
              }}
            >
              Return to Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}