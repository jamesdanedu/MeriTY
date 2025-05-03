import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ClassGroups() {
  const [classGroups, setClassGroups] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Check authentication first
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
        
        // Load academic years for the filter dropdown
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);
        
        // Get current academic year
        const { data: currentYearData, error: currentYearError } = await supabase
          .from('academic_years')
          .select('*')
          .eq('is_current', true)
          .single();
          
        if (currentYearError && currentYearError.code !== 'PGRST116') {
          // PGRST116 is the error code for "No rows returned" - not a problem if no current year is set
          throw currentYearError;
        }
        
        if (currentYearData) {
          setCurrentYear(currentYearData);
          setSelectedYear(currentYearData.id);
        } else if (yearsData && yearsData.length > 0) {
          // If no current year is set, default to the most recent year
          setSelectedYear(yearsData[0].id);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);
  
  useEffect(() => {
    // Load class groups when selectedYear changes
    async function loadClassGroups() {
      if (!selectedYear) return;
      
      try {
        setLoading(true);
        
        // Get class groups with academic year name
        const { data, error } = await supabase
          .from('class_groups')
          .select(`
            id, 
            name, 
            academic_year_id,
            academic_years(name)
          `)
          .eq('academic_year_id', selectedYear)
          .order('name', { ascending: true });

        if (error) throw error;
        setClassGroups(data || []);
      } catch (err) {
        console.error('Error loading class groups:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadClassGroups();
  }, [selectedYear]);

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };
  
  const handleAddClassGroup = () => {
    window.location.href = '/class-groups/new';
  };

  const handleEditClassGroup = (id) => {
    window.location.href = `/class-groups/${id}/edit`;
  };

  const handleDeleteClassGroup = (id) => {
    window.location.href = `/class-groups/${id}/delete`;
  };
  
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
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
          }}>Loading class groups...</h1>
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
          }}>Class Groups</h1>
          <div style={{
            display: 'flex',
            gap: '0.75rem'
          }}>
            <button
              onClick={handleAddClassGroup}
              style={{ 
                backgroundColor: 'white',
                color: '#3b82f6',
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
              <span style={{ marginRight: '0.25rem' }}>+</span> Add Class Group
            </button>
            <button
              onClick={goToDashboard}
              style={{ 
                backgroundColor: 'transparent',
                color: 'white',
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
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Manage class groups and their assignments for each academic year.
          </p>
          
          {/* Academic Year Filter */}
          {academicYears.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <label 
                htmlFor="yearFilter" 
                style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151'
                }}
              >
                Academic Year:
              </label>
              <select
                id="yearFilter"
                value={selectedYear || ''}
                onChange={handleYearChange}
                style={{ 
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#374151',
                  backgroundColor: 'white'
                }}
              >
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {classGroups.length === 0 ? (
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
              <Users size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              No class groups found
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              {selectedYear 
                ? `Add your first class group for the selected academic year.`
                : `Please select an academic year to manage class groups.`}
            </p>
            {selectedYear && (
              <button
                onClick={handleAddClassGroup}
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
                <span style={{ marginRight: '0.25rem' }}>+</span> Add Class Group
              </button>
            )}
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
                      Academic Year
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
                  {classGroups.map((group, index) => (
                    <tr key={group.id} style={{
                      borderBottom: index < classGroups.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500'
                      }}>
                        {group.name}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>
                        {group.academic_years?.name || 'Unknown'}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'right'
                      }}>
                        <button
                          onClick={() => handleEditClassGroup(group.id)}
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
                          onClick={() => handleDeleteClassGroup(group.id)}
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