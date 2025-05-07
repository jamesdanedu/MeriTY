import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserCog, Upload, LogOut } from 'lucide-react';
import { getSession } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Check authentication first
        const { session } = getSession();
        
        if (!session) {
          window.location.href = '/login';
          return;
        }

        // Store user data
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
          // Redirect non-admin users back to dashboard
          window.location.href = '/dashboard';
          return;
        }
        
        // Load teachers
        const { data, error } = await supabase
          .from('teachers')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setTeachers(data || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };
  
  const handleAddTeacher = () => {
    window.location.href = '/teachers/new';
  };

  const handleImportTeachers = () => {
    window.location.href = '/teachers/import';
  };

  const handleEditTeacher = (id) => {
    window.location.href = `/teachers/${id}/edit`;
  };

  const handleDeleteTeacher = (id) => {
    window.location.href = `/teachers/${id}/delete`;
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
          }}>Loading teachers...</h1>
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
            onClick={goToDashboard}
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
            Return to Dashboard
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
          }}>MeriTY - Teachers</h1>
          <div style={{
            display: 'flex',
            gap: '0.75rem'
          }}>
            <button
              onClick={handleAddTeacher}
              style={{ 
                backgroundColor: '#4f46e5',
                color: 'white',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.875rem'
              }}
            >
              <span style={{ marginRight: '0.25rem' }}>+</span> Add Teacher
            </button>
            <button
              onClick={handleImportTeachers}
              style={{ 
                backgroundColor: '#10b981',
                color: 'white',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.875rem',
                gap: '0.25rem'
              }}
            >
              <Upload size={16} />
              Bulk Import
            </button>
            <button
              onClick={goToDashboard}
              style={{ 
                backgroundColor: 'white',
                color: '#4f46e5',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #4f46e5',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <span style={{ marginRight: '0.25rem' }}>←</span> Back to Dashboard
            </button>
          </div>
        </div>
      </header>
      
      <main style={{
        maxWidth: '1400px',
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
            Manage teachers and administrators, or import multiple teachers at once using the bulk import option.
          </p>
        </div>
        
        {teachers.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '3rem 1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              marginBottom: '1rem',
              fontSize: '1.5rem',
              color: '#9ca3af'
            }}>
              <UserCog size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              No teachers found
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              Add your first teacher or use the bulk import feature to add multiple teachers at once.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={handleAddTeacher}
                style={{ 
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.875rem'
                }}
              >
                <span style={{ marginRight: '0.25rem' }}>+</span> Add Teacher
              </button>
              <button
                onClick={handleImportTeachers}
                style={{ 
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  gap: '0.25rem'
                }}
              >
                <Upload size={16} />
                Bulk Import
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            overflow: 'hidden'
          }}>
            <div style={{
              overflowX: 'auto',
              width: '100%'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Name
                    </th>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Email
                    </th>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Role
                    </th>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Status
                    </th>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Last Login
                    </th>
                    <th style={{
                      textAlign: 'right',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher, index) => (
                    <tr key={teacher.id} style={{
                      borderBottom: index < teachers.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500'
                      }}>
                        {teacher.name}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>
                        {teacher.email}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem'
                      }}>
                        {teacher.is_admin ? (
                          <span style={{
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            Administrator
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            Teacher
                          </span>
                        )}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem'
                      }}>
                        {teacher.is_active ? (
                          <span style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            Active
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }}>
                        {teacher.last_login ? new Date(teacher.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'right'
                      }}>
                        <button
                          onClick={() => handleEditTeacher(teacher.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#4f46e5',
                            fontWeight: '500',
                            cursor: 'pointer',
                            marginRight: '1rem'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}