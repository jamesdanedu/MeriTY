import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DeleteTeacher() {
  const router = useRouter();
  const { id } = router.query;
  
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

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
          
          // Check if trying to delete self
          if (data.email === authData.session.user.email) {
            setError('You cannot delete your own account');
            return;
          }
          
          setTeacher(data);
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

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      // Check for teacher records that might depend on this teacher
      // For example, check if this teacher is assigned to any class groups
      // or has created any records that would be orphaned
      
      // This is a placeholder - add actual dependency checks based on your DB
      const hasDependencies = false;
      
      if (hasDependencies) {
        setError('This teacher cannot be deleted because they have associated records');
        setDeleting(false);
        return;
      }

      // Delete the teacher
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Redirect to teachers list
      window.location.href = '/teachers';
    } catch (err) {
      console.error('Error deleting teacher:', err);
      setError(err.message);
      setDeleting(false);
    }
  };

  const handleDeactivate = async () => {
    setDeleting(true);
    setError(null);

    try {
      // Update the teacher to inactive status instead of deleting
      const { error } = await supabase
        .from('teachers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Redirect to teachers list
      window.location.href = '/teachers';
    } catch (err) {
      console.error('Error deactivating teacher:', err);
      setError(err.message);
      setDeleting(false);
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

  if (error) {
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
          }}>Delete Teacher</h1>
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
        maxWidth: '600px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '1.5rem'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '9999px',
              width: '3rem',
              height: '3rem',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={24} />
            </div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Delete Teacher Account
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              Are you sure you want to delete the account for <strong>{teacher.name}</strong>?
            </p>
            <p style={{
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Email: {teacher.email}
            </p>
            <p style={{
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              Role: {teacher.is_admin ? 'Administrator' : 'Teacher'}
            </p>
            
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fbbf24',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                color: '#92400e',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>Warning</p>
              <p style={{
                color: '#92400e',
                fontSize: '0.875rem'
              }}>
                Deleting this account will permanently remove all user data and revoke access. Consider deactivating the account instead if you might need to restore it later.
              </p>
            </div>
          </div>
          
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
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              onClick={goBack}
              disabled={deleting}
              style={{ 
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeactivate}
              disabled={deleting}
              style={{ 
                backgroundColor: '#f59e0b',
                color: 'white',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1
              }}
            >
              {deleting ? 'Processing...' : 'Deactivate Instead'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ 
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1
              }}
            >
              {deleting ? 'Deleting...' : 'Delete Teacher'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
