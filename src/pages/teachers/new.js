import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/utils/auth';
import { generateSalt, hashPassword, generateTemporaryPassword } from '@/utils/password';
import { sendTeacherEmail } from '@/utils/emailClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewTeacher() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isAdmin: false,
    isActive: true,
    sendEmail: false
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const { session } = getSession();
        
        if (!session) {
          window.location.href = '/login';
          return;
        }

        setUser(session.user);
        
        // Check if user is an admin
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (teacherError) {
          throw teacherError;
        }
        
        if (!teacherData || !teacherData.is_admin) {
          window.location.href = '/dashboard';
          return;
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
  
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      setSaving(false);
      return;
    }
  
    try {
      const { data: existingTeacher, error: checkError } = await supabase
        .from('teachers')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();
  
      if (checkError) throw checkError;
      
      if (existingTeacher) {
        setError('A teacher with this email already exists');
        setSaving(false);
        return;
      }
  
      const tempPassword = generateTemporaryPassword();
      const salt = generateSalt();
      const hashedPassword = hashPassword(tempPassword, salt);
  
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .insert({
          name: formData.name,
          email: formData.email,
          is_admin: formData.isAdmin,
          is_active: formData.isActive,
          password_hash: hashedPassword,
          password_salt: salt,
          must_change_password: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
  
      if (teacherError) throw teacherError;
  
      if (formData.sendEmail) {
        try {
          await sendTeacherEmail('newTeacher', {
            name: formData.name,
            email: formData.email,
            password: tempPassword
          });
          
          setMessage(`Teacher account created successfully and welcome email sent to ${formData.email}`);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          setMessage(`Teacher account created successfully, but failed to send welcome email. 
            Temporary password: ${tempPassword}`);
        }
      } else {
        setMessage(`Teacher account created successfully.
          Email: ${formData.email}
          Temporary Password: ${tempPassword}
          
          Please provide these credentials to the teacher securely.`);
      }
  
      setTimeout(() => {
        window.location.href = '/teachers';
      }, 5000);
  
    } catch (err) {
      console.error('Error creating teacher:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  const goBack = () => {
    window.location.href = '/teachers';
  };

  if (loading) {
    return (
      <div style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#4b5563',
            marginBottom: '0.5rem'
          }}>Loading...</h1>
          <p style={{
            color: '#6b7280'
          }}>Please wait</p>
        </div>
      </div>
    );
  }

  if (error && !saving) {
    return (
      <div style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '500px',
          padding: '0 1rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#b91c1c',
            marginBottom: '0.5rem'
          }}>Error</h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>{error}</p>
          <button 
            onClick={goBack}
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
            Return to Teachers
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
      width: '100%'
    }}>
      <header style={{
        backgroundColor: '#3b82f6',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        padding: '0.75rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white'
          }}>MeriTY - Add Teacher</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#4f46e5',
              fontWeight: 500,
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #4f46e5',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Teachers
          </button>
        </div>
      </header>
      
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Create a new teacher account. A temporary password will be generated for the teacher.
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '1.5rem'
        }}>
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              padding: '1rem',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontWeight: '500' }}>Error</p>
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '1rem',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem',
              whiteSpace: 'pre-line'
            }}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="name" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
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
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@school.edu"
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="isAdmin"
                  name="isAdmin"
                  type="checkbox"
                  checked={formData.isAdmin}
                  onChange={handleChange}
                  style={{ 
                    marginRight: '0.5rem'
                  }}
                />
                <label 
                  htmlFor="isAdmin" 
                  style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151'
                  }}
                >
                  Administrator Role
                </label>
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
                marginLeft: '1.5rem'
              }}>
                Administrators can manage all aspects of the system, including users, academic years, and system settings.
              </p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={handleChange}
                  style={{ 
                    marginRight: '0.5rem'
                  }}
                />
                <label 
                  htmlFor="isActive" 
                  style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151'
                  }}
                >
                  Active Status
                </label>
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
                marginLeft: '1.5rem'
              }}>
                Inactive teachers cannot log in to the system. You can deactivate accounts instead of deleting them.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="sendEmail"
                  name="sendEmail"
                  type="checkbox"
                  checked={formData.sendEmail}
                  onChange={handleChange}
                  style={{ 
                    marginRight: '0.5rem'
                  }}
                />
                <label 
                  htmlFor="sendEmail" 
                  style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151'
                  }}
                >
                  Send Email Notification
                </label>
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
                marginLeft: '1.5rem'
              }}>
                If enabled, the teacher will receive an email with their login credentials. If disabled, the credentials will be displayed here for you to provide manually.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={goBack}
                disabled={saving}
                style={{ 
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ 
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Create Teacher'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}