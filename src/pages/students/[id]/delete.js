// src/pages/students/[id]/delete.js
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DeleteStudent() {
  const router = useRouter();
  const { id } = router.query;
  
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [hasEnrollments, setHasEnrollments] = useState(false);

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
        
        // Only load student data if we have an ID
        if (id) {
          // Get student with class group info
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select(`
              *,
              class_groups (
                id,
                name
              )
            `)
            .eq('id', id)
            .single();

          if (studentError) throw studentError;
          
          if (!studentData) {
            setError('Student not found');
            return;
          }
          
          setStudent(studentData);
          
          // Check if student has enrollments
          const { count, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', id);
            
          if (enrollmentsError) throw enrollmentsError;
          
          setHasEnrollments(count > 0);
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
      // Check if student has enrollments first
      if (hasEnrollments) {
        setError(`This student has enrollments in subjects. Please remove these enrollments before deleting.`);
        setDeleting(false);
        return;
      }

      // Delete the student
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Redirect to students list
      window.location.href = '/students';
    } catch (err) {
      console.error('Error deleting student:', err);
      setError(err.message);
      setDeleting(false);
    }
  };

  const goBack = () => {
    window.location.href = '/students';
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
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Students
          </button>
        </div>
      </div>
    );
  }
  
  if (!student && !loading) {
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
          }}>The student you're looking for cannot be found.</p>
          <button 
            onClick={goBack}
            style={{ 
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Students
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
        backgroundColor: '#3b82f6', // Blue for students
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
          }}>Delete Student</h1>
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Students
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
              Delete Student
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              Are you sure you want to delete <strong>{student.name}</strong>?
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
                }}>Student Details:</span>
                <span style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: '#111827',
                }}>Email: {student.email || 'Not provided'}</span>
                <span style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: '#111827',
                }}>Class Group: {student.class_groups?.name || 'Not assigned'}</span>
              </div>
            </div>
            
            {hasEnrollments && (
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
                  This student is enrolled in subjects. You must remove these enrollments before deleting the student.
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
                Deleting this student cannot be undone. This will permanently remove all their data from the system.
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
              disabled={deleting || hasEnrollments}
              style={{ 
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: (deleting || hasEnrollments) ? 'not-allowed' : 'pointer',
                opacity: (deleting || hasEnrollments) ? 0.7 : 1
              }}
            >
              {deleting ? 'Deleting...' : 'Delete Student'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}