import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { School, BookOpen, ChevronDown, ChevronUp, Award } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CreditsByClassGroup() {
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Data state
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classGroups, setClassGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [studentCredits, setStudentCredits] = useState({});

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Check authentication
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!authData.session) {
          window.location.href = '/login';
          return;
        }

        setUser(authData.session.user);
        
        // Check if user is a teacher
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', authData.session.user.email)
          .single();
          
        if (teacherError) throw teacherError;
        if (!teacherData) {
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
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadClassGroups(yearsData[0].id);
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
      setLoading(true);
      
      // Get class groups for the selected year
      const { data: groups, error: groupsError } = await supabase
        .from('class_groups')
        .select(`
          id,
          name,
          students (
            id,
            name,
            email
          )
        `)
        .eq('academic_year_id', yearId)
        .order('name');
        
      if (groupsError) throw groupsError;

      // Initialize expanded state for new groups
      const newExpandedState = {};
      groups.forEach(group => {
        newExpandedState[group.id] = expandedGroups[group.id] || false;
      });
      setExpandedGroups(newExpandedState);

      // Load credit data for all students
      await loadStudentCredits(groups);

      setClassGroups(groups || []);
    } catch (err) {
      console.error('Error loading class groups:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentCredits = async (groups) => {
    try {
      const allStudents = groups.flatMap(group => group.students || []);
      const studentIds = allStudents.map(student => student.id);
      
      if (studentIds.length === 0) return;

      // Get all credit sources for these students
      const creditData = {};

      // Get subject enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('student_id, credits_earned')
        .in('student_id', studentIds);
        
      if (enrollmentsError) throw enrollmentsError;

      // Get work experience credits
      const { data: workExperience, error: workError } = await supabase
        .from('work_experience')
        .select('student_id, credits_earned')
        .in('student_id', studentIds);
        
      if (workError) throw workError;

      // Get portfolio credits
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('student_id, credits_earned')
        .in('student_id', studentIds);
        
      if (portfoliosError) throw portfoliosError;

      // Get attendance credits
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, credits_earned')
        .in('student_id', studentIds);
        
      if (attendanceError) throw attendanceError;

      // Calculate total credits for each student
      studentIds.forEach(studentId => {
        const studentEnrollments = enrollments?.filter(e => e.student_id === studentId) || [];
        const studentWork = workExperience?.filter(w => w.student_id === studentId) || [];
        const studentPortfolios = portfolios?.filter(p => p.student_id === studentId) || [];
        const studentAttendance = attendance?.filter(a => a.student_id === studentId) || [];

        const totalCredits = {
          subjects: studentEnrollments.reduce((sum, e) => sum + (e.credits_earned || 0), 0),
          work: studentWork.reduce((sum, w) => sum + (w.credits_earned || 0), 0),
          portfolios: studentPortfolios.reduce((sum, p) => sum + (p.credits_earned || 0), 0),
          attendance: studentAttendance.reduce((sum, a) => sum + (a.credits_earned || 0), 0)
        };

        totalCredits.total = totalCredits.subjects + totalCredits.work + 
                           totalCredits.portfolios + totalCredits.attendance;

        creditData[studentId] = totalCredits;
      });

      setStudentCredits(creditData);
    } catch (err) {
      console.error('Error loading student credits:', err);
      setError(err.message);
    }
  };

  const handleYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    await loadClassGroups(yearId);
  };

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const goBack = () => {
    window.location.href = '/credits';
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

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%'
    }}>
      <header style={{
        backgroundColor: '#eab308', // Amber color for credits
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
          }}>Credits by Class Group</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#eab308',
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Credits
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        {/* Year Selection */}
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <label 
            htmlFor="yearSelect" 
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
            id="yearSelect"
            value={selectedYear || ''}
            onChange={handleYearChange}
            style={{ 
              width: '100%',
              maxWidth: '300px',
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

        {/* Class Groups List */}
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
              color: '#9ca3af'
            }}>
              <School size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              No Class Groups Found
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              There are no class groups for the selected academic year.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {classGroups.map(group => (
              <div
                key={group.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden'
                }}
              >
                {/* Group Header */}
                <div 
                  onClick={() => toggleGroupExpansion(group.id)}
                  style={{
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                    borderBottom: expandedGroups[group.id] ? '1px solid #e5e7eb' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {group.name}
                    </h3>
                    <span style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {group.students?.length || 0} students
                    </span>
                  </div>
                  {expandedGroups[group.id] ? (
                    <ChevronUp size={20} style={{ color: '#6b7280' }} />
                  ) : (
                    <ChevronDown size={20} style={{ color: '#6b7280' }} />
                  )}
                </div>

                {/* Students List */}
                {expandedGroups[group.id] && (
                  <div style={{
                    overflowX: 'auto'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse'
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: '#f9fafb'
                        }}>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>Student</th>
                          <th style={{
                            textAlign: 'center',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>Subjects</th>
                          <th style={{
                            textAlign: 'center',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>Work Experience</th>
                          <th style={{
                            textAlign: 'center',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>Portfolio</th>
                          <th style={{
                            textAlign: 'center',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>Attendance</th>
                          <th style={{
                            textAlign: 'center',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.students?.map((student, index) => {
                          const credits = studentCredits[student.id] || {
                            subjects: 0,
                            work: 0,
                            portfolios: 0,
                            attendance: 0,
                            total: 0
                          };

                          return (
                            <tr key={student.id} style={{
                              borderBottom: index < group.students.length - 1 ? '1px solid #e5e7eb' : 'none'
                            }}>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#111827'
                              }}>
                                <div style={{ fontWeight: '500' }}>{student.name}</div>
                                {student.email && (
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280'
                                  }}>{student.email}</div>
                                )}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#374151',
                                textAlign: 'center'
                              }}>
                                {credits.subjects}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#374151',
                                textAlign: 'center'
                              }}>
                                {credits.work}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#374151',
                                textAlign: 'center'
                              }}>
                                {credits.portfolios}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                color: '#374151',
                                textAlign: 'center'
                              }}>
                                {credits.attendance}
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                fontSize: '0.875rem',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  backgroundColor: credits.total >= 200 ? '#dcfce7' : '#fee2e2',
                                  color: credits.total >= 200 ? '#166534' : '#991b1b',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '9999px',
                                  display: 'inline-block',
                                  fontWeight: '500'
                                }}>
                                  {credits.total}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}