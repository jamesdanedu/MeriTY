import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DeleteSubject() {
  const router = useRouter();
  const { id } = router.query;
  
  const [subject, setSubject] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [enrollmentCount, setEnrollmentCount] = useState(0);

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
        
        // Only load subject data if we have an ID
        if (id) {
          // Get subject with academic year info
          const { data: subjectData, error: subjectError } = await supabase
            .from('subjects')
            .select(`
              *,
              academic_years (*)
            `)
            .eq('id', id)
            .single();

          if (subjectError) throw subjectError;
          
          if (!subjectData) {
            setError('Subject not found');
            return;
          }
          
          setSubject(subjectData);
          setAcademicYear(subjectData.academic_years);
          
          // Check if there are enrollments for this subject
          // This assumes there's an enrollments table with a subject_id field
          const { count, error: countError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', id);
            
          if (countError && countError.code !== 'PGRST109') { // Code for nonexistent table
            throw countError;
          }
          
          if (count !== null) {
            setEnrollmentCount(count);
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
      // Check if there are enrollments before deleting
      if (enrollmentCount > 0) {
        setError(`This subject has ${enrollmentCount} enrollments. Please remove them before deleting.`);
        setDeleting(false);
        return;
      }

      // Delete the subject
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Redirect to subjects list
      window.location.href = '/subjects';
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError(err.message);
      setDeleting(false);
    }
  };

  const goBack = () => {
    window.location.href = '/subjects';
  };

  // Function to get a readable string for subject type
  const formatSubjectType = (type) => {
    switch(type) {
      case 'core':
        return 'Core';
      case 'optional':
        return 'Optional';
      case 'short':
        return 'Short Course';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  // Function to get style for subject type badge
  const getTypeStyle = (type) => {
    switch(type) {
      case 'core':
        return {
          backgroundColor: '#dbeafe',
          color: '#1e40af'
        };
      case 'optional':
        return {
          backgroundColor: '#dcfce7',
          color: '#166534'
        };
      case 'short':
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e'
        };
      case 'other':
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#4b5563'
        };
    }
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
              backgroundColor: '#7c3aed',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Subjects
          </button>
        </div>
      </div>
    );
  }
  
  if (!subject && !loading) {
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
          }}>The subject you're looking for cannot be found.</p>
          <button 
            onClick={goBack}
            style={{ 
              backgroundColor: '#7c3aed',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Subjects
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
        backgroundColor: '#7c3aed', // Purple for subjects
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
          }}>Delete Subject</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#7c3aed',
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Subjects
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
              Delete Subject
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              Are you sure you want to delete the subject <strong>{subject.name}</strong>?
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
                }}>Subject Details:</span>
                <span style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: '#111827',
                  marginBottom: '0.25rem'
                }}>Academic Year: {academicYear?.name || 'Unknown'}</span>
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.875rem',
                  marginBottom: '0.25rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: getTypeStyle(subject.type).backgroundColor,
                  color: getTypeStyle(subject.type).color
                }}>
                  {formatSubjectType(subject.type)}
                </span>
                <span style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: '#111827',
                  marginTop: '0.25rem'
                }}>
                  Default Credits: {subject.credit_value}
                </span>
              </div>
            </div>
            
            {enrollmentCount > 0 && (
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
                  This subject has {enrollmentCount} student enrollments. You must remove these enrollments before deleting the subject.
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
                Deleting this subject cannot be undone. This will permanently remove it from the system.
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
              disabled={deleting || enrollmentCount > 0}
              style={{ 
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: (deleting || enrollmentCount > 0) ? 'not-allowed' : 'pointer',
                opacity: (deleting || enrollmentCount > 0) ? 0.7 : 1
              }}
            >
              {deleting ? 'Deleting...' : 'Delete Subject'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}