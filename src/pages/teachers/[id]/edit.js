import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EditTeacher() {
  const router = useRouter();
  const { id } = router.query;
  
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isAdmin: false,
    isActive: true,
    resetPassword: false
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Check authentication
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          throw authError;
        }
        
        if (!authData.session) {
          window.location.href = '/login';
          return;
        }

        // Store user data
        setUser(authData.session.user);
        
        // Check if user is an admin
        const { data: adminData, error: adminError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', authData.session.user.email)
          .single();
          
        if (adminError) {
          throw adminError;
        }
        
        if (!adminData || !adminData.is_admin) {
          // Redirect non-admin users back to dashboard
          window.location.href = '/dashboard';
          return;
        }
        
        // Only load teacher data if we have an ID
        if (id) {
          const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          
          if (!data) {
            setError('Teacher not found');
            return;
          }
          
          setTeacher(data);
          setFormData({
            name: data.name,
            email: data.email,
            isAdmin: data.is_admin,
            isActive: data.is_active,
            resetPassword: false
          });
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

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

    // Validate form
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      setSaving(false);
      return;
    }

    try {
      // If email has changed, check if it already exists for another teacher
      if (formData.email !== teacher.email) {
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
      }

      // Get the original teacher record to preserve hashed_password if it exists
      const { data: originalTeacher, error: getError } = await supabase
        .from('teachers')
        .select('hashed_password')
        .eq('id', id)
        .single();
        
      if (getError) throw getError;

      // Update teacher in the teachers table
      const { data, error } = await supabase
        .from('teachers')
        .update({
          name: formData.name,
          email: formData.email,
          is_admin: formData.isAdmin,
          is_active: formData.isActive,
          hashed_password: originalTeacher.hashed_password || 'placeholder_managed_by_auth' // Preserve existing password or set placeholder
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If resetPassword is checked, send a password reset email
      if (formData.resetPassword) {
        try {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            formData.email,
            { redirectTo: `${window.location.origin}/reset-password` }
          );
          
          if (resetError) {
            console.warn('Failed to send password reset email:', resetError);
            // We'll continue since the teacher record was updated successfully
          }
        } catch (resetErr) {
          console.warn('Error sending password reset:', resetErr);
          // We'll continue since the teacher record was updated successfully
        }
      }

      // Redirect back to teachers list
      window.location.href = '/teachers';
    } catch (err) {
      console.error('Error updating teacher:', err);
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
  
  if (!teacher && !loading) {
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
          }}>Not Found</h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>The teacher you're looking for cannot be found.</p>
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
          }}>Edit Teacher</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#3b82f6',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid white',
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
            Update teacher information and permissions.
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
            
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="resetPassword"
                  name="resetPassword"
                  type="checkbox"
                  checked={formData.resetPassword}
                  onChange={handleChange}
                  style={{ 
                    marginRight: '0.5rem'
                  }}
                />
                <label 
                  htmlFor="resetPassword" 
                  style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151'
                  }}
                >
                  Send Password Reset Email
                </label>
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
                marginLeft: '1.5rem'
              }}>
                The teacher will receive an email with instructions to reset their password.
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
                {saving ? 'Saving...' : 'Update Teacher'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
