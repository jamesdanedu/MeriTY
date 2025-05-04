import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { GraduationCap } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function StudentReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Authentication check
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!authData.session) {
          window.location.href = '/login';
          return;
        }

        // Load academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);

        // Set current year
        const currentYear = yearsData?.find(year => year.is_current);
        if (currentYear) {
            setSelectedYear(currentYear.id);
            await loadClassGroups(currentYear.id);
            await loadStudents(currentYear.id);
          } else if (yearsData?.length > 0) {
            setSelectedYear(yearsData[0].id);
            await loadClassGroups(yearsData[0].id);
            await loadStudents(yearsData[0].id);
          }
        } catch (err) {
          console.error('Error loading initial data:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
  
      loadInitialData();
    }, []);
  
    const loadClassGroups = async (yearId) => {
      try {
        const { data, error } = await supabase
          .from('class_groups')
          .select('*')
          .eq('academic_year_id', yearId)
          .order('name', { ascending: true });
          
        if (error) throw error;
        setClassGroups(data || []);
      } catch (err) {
        console.error('Error loading class groups:', err);
        setError(err.message);
      }
    };
  
    const loadStudents = async (yearId) => {
      try {
        let query = supabase
          .from('students')
          .select(`
            id,
            name,
            email,
            class_groups (
              id,
              name,
              academic_year_id
            ),
            enrollments (
              credits_earned,
              subjects (
                name,
                type
              )
            )
          `)
          .eq('class_groups.academic_year_id', yearId);
  
        // Apply class group filter if selected
        if (selectedClassGroup !== 'all') {
          query = query.eq('class_groups.id', selectedClassGroup);
        }
  
        // Apply search term if exists
        if (searchTerm) {
          query = query.or(
            `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          );
        }
  
        const { data, error } = await query.order('name');
  
        if (error) throw error;
  
        // Compute total credits for each student
        const studentsWithCredits = data.map(student => ({
          ...student,
          totalCredits: student.enrollments.reduce((sum, enrollment) => 
            sum + (enrollment.credits_earned || 0), 0)
        }));
  
        setStudents(studentsWithCredits);
      } catch (err) {
        console.error('Error loading students:', err);
        setError(err.message);
      }
    };
  
    const handleYearChange = async (e) => {
      const yearId = e.target.value;
      setSelectedYear(yearId);
      setSelectedClassGroup('all');
      await loadClassGroups(yearId);
      await loadStudents(yearId);
    };
  
    const handleClassGroupChange = async (e) => {
      const classGroupId = e.target.value;
      setSelectedClassGroup(classGroupId);
      await loadStudents(selectedYear);
    };
  
    const goBack = () => {
      window.location.href = '/reports';
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
            }}>Loading Student Reports...</h1>
            <p style={{
              color: '#6b7280'
            }}>Please wait</p>
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
        {/* Header */}
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
            }}>Student Reports</h1>
            <button
              onClick={goBack}
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
              <span style={{ marginRight: '0.25rem' }}>←</span> Back to Reports
            </button>
          </div>
        </header>
  
        {/* Main Content */}
        <main style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1.5rem'
        }}>
          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Academic Year Filter */}
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="yearFilter" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Academic Year
              </label>
              <select
                id="yearFilter"
                value={selectedYear || ''}
                onChange={handleYearChange}
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Class Group Filter */}
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="classGroupFilter" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Class Group
              </label>
              <select
                id="classGroupFilter"
                value={selectedClassGroup}
                onChange={handleClassGroupChange}
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="all">All Class Groups</option>
                {classGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Search Input */}
            <div style={{ flex: 2 }}>
              <label 
                htmlFor="searchInput" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Search Students
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadStudents(selectedYear);
                  }}
                  style={{ 
                    width: '100%',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
                <Search 
                  size={20} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280'
                  }} 
                />
              </div>
            </div>
          </div>
  
          {/* Students Table */}
          {students.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              padding: '3rem 1.5rem',
              textAlign: 'center'
            }}>
              <GraduationCap size={48} style={{ margin: '0 auto', color: '#9ca3af', marginBottom: '1rem' }} />
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                No Students Found
              </h3>
              <p style={{
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                {searchTerm 
                  ? `No students match the search term "${searchTerm}"` 
                  : 'No students available for the selected academic year and class group'}
              </p>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              overflow: 'hidden'
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
                      color: '#374151'
                    }}>Name</th>
                    <th style={{
                      textAlign: 'left',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>Class Group</th>
                    <th style={{
                      textAlign: 'center',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>Total Credits</th>
                    <th style={{
                      textAlign: 'right',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id} style={{
                      borderBottom: index < students.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500'
                      }}>
                        {student.name}
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6b7280'
                        }}>
                          {student.email}
                        </div>
                      </td>
                          <td style={{
                            backgroundColor: 'white',
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            textAlign: 'right'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: '0.5rem'
                            }}>
                              <button
                                onClick={() => handleViewStudentDetails(student.id)}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <FileText size={16} />
                                Details
                              </button>
                              <button
                                onClick={() => handleGenerateCertificate(student)}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  color: '#10b981',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Award size={16} />
                                Certificate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
      
                  {/* Pagination - Optional, can be added later */}
                  {students.length > 10 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '1rem 1.5rem',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }}>
                        Showing 1-{students.length} of {students.length} students
                      </span>
                      <div>
                        <button style={{
                          marginRight: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          backgroundColor: 'white'
                        }}>
                          Previous
                        </button>
                        <button style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          backgroundColor: 'white'
                        }}>
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
      
              {/* Statistics Overview */}
              <div style={{
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      Total Students
                    </span>
                    <GraduationCap size={20} style={{ color: '#3b82f6' }} />
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#111827'
                  }}>
                    {students.length}
                  </div>
                </div>
      
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      Average Credits
                    </span>
                    <Award size={20} style={{ color: '#10b981' }} />
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#111827'
                  }}>
                    {students.length > 0 
                      ? (students.reduce((sum, s) => sum + s.totalCredits, 0) / students.length).toFixed(1)
                      : '0.0'}
                  </div>
                </div>
      
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      Top Performing Students
                    </span>
                    <FileText size={20} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#111827'
                  }}>
                    {students
                      .sort((a, b) => b.totalCredits - a.totalCredits)
                      .slice(0, 3)
                      .map(s => s.name)
                      .join(', ')}
                  </div>
                </div>
              </div>
            </main>
          </div>
        );
      }
