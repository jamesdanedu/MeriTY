import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DeleteClassGroup() {
  const router = useRouter();
  const { id } = router.query;
  
  const [classGroup, setClassGroup] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [studentCount, setStudentCount] = useState(0);

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
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', authData.session.user.email)
          .single();
          
        if (teacherError) {
          throw teacherError;
        }
        
        if (!teacherData || !teacherData.is_admin) {
          // Redirect non-admin users back to dashboard
          window.location.href = '/dashboard';
          return;
        }
        
        // Only load class group data if we have an ID
        if (id) {
          // Get class group with academic year info
          const { data: groupData, error: groupError } = await supabase
            .from('class_groups')
            .select(`
              *,
              academic_years (*)
            `)
            .eq('id', id)
            .single();

          if (groupError) throw groupError;
          
          if (!groupData) {
            setError('Class group not found');
            return;
          }
          
          setClassGroup(groupData);
          setAcademicYear(groupData.academic_years);
          
          // Check if there are students in this class group
          // This would depend on your database structure - adjust as needed
          const { count, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_group_id', id);
            
          if (countError && countError.code !== 'PGRST109') { // Code for nonexistent table
            throw countError;
          }
          
          if (count !== null) {
            setStudentCount(count);
          }
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
      // Check if there are students or dependencies before deleting
      if (studentCount > 0) {
        setError(`This class group has ${studentCount} students. Please reassign or remove them before deleting.`);
        setDeleting(false);
        return;
      }

      // Delete the class group
      const { error } = await supabase
        .from('class_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Redirect to class groups list
      window.location.href = '/class-groups';
    } catch (err) {
      console.error('Error deleting class group:', err);
      setError(err.message);
      setDeleting(false);
    }
  };

  const goBack = () => {
    window.location.href = '/class-groups';
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
            Return to Class Groups
          </button>
        </div>
      </div>
    );
  }
  
  if (!classGroup && !loading) {
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
          }}>The class group you're looking for cannot be found.</p>
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
            Return to Class Groups
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
          }}>Delete Class Group</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#3b82f6',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Class Groups
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
              Delete Class Group
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              Are you sure you want to delete the class group <strong>{classGroup.name}</strong>?
            </p>
            <div style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ 
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#4b5563',
                  marginBottom: '0.25rem'
                }}>Class Details:</span>
                <span style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: '#111827',
                }}>Academic Year: {academicYear?.name || 'Unknown'}</span>
              </div>
            </div>
            
            {studentCount > 0 && (
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
                  This class group has {studentCount} students assigned to it. You must reassign or remove these students before deleting the group.
                </p>
              </div>
            )}
            
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '0.375rem',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                color: '#b91c1c',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>Attention</p>
              <p style={{
                color: '#b91c1c',
                fontSize: '0.875rem'
              }}>
                Deleting this class group cannot be undone. This will permanently remove all associated data.
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
              onClick={handleDelete}
              disabled={deleting || studentCount > 0}
              style={{ 
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: (deleting || studentCount > 0) ? 'not-allowed' : 'pointer',
                opacity: (deleting || studentCount > 0) ? 0.7 : 1
              }}
            >
              {deleting ? 'Deleting...' : 'Delete Class Group'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}