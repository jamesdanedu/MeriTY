import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Award, BookOpen, ArrowRight } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function OptionalSubjectCredits() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [optionalSubjects, setOptionalSubjects] = useState([]);
  const [subjectStats, setSubjectStats] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [classGroups, setClassGroups] = useState([]);

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

        // Store user data
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
          await loadOptionalSubjects(currentYear.id);
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadOptionalSubjects(yearsData[0].id);
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

  const loadOptionalSubjects = async (yearId) => {
    try {
      setLoading(true);

      // Load class groups for filtering
      const { data: groups, error: groupsError } = await supabase
        .from('class_groups')
        .select('*')
        .eq('academic_year_id', yearId)
        .order('name', { ascending: true });
        
      if (groupsError) throw groupsError;
      setClassGroups(groups || []);
      
      // Load optional subjects for the selected year
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('academic_year_id', yearId)
        .eq('type', 'optional')
        .order('name', { ascending: true });
        
      if (subjectsError) throw subjectsError;
      setOptionalSubjects(subjects || []);

      // Load stats for each subject
      const stats = {};
      
      for (const subject of subjects || []) {
        // Get enrollments for this subject
        const { data: subjectEnrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            id,
            credits_earned,
            students (
              id,
              class_group_id
            )
          `)
          .eq('subject_id', subject.id);
          
        if (enrollmentsError) throw enrollmentsError;

        // Calculate totals and group by class
        const totalCredits = subjectEnrollments?.reduce((sum, e) => sum + (e.credits_earned || 0), 0) || 0;
        const totalEnrollments = subjectEnrollments?.length || 0;
        const avgCredits = totalEnrollments ? Math.round(totalCredits / totalEnrollments) : 0;

        // Group enrollments by class
        const byClass = {};
        subjectEnrollments?.forEach(enrollment => {
          const classId = enrollment.students?.class_group_id;
          if (classId) {
            if (!byClass[classId]) {
              byClass[classId] = {
                count: 0,
                totalCredits: 0
              };
            }
            byClass[classId].count++;
            byClass[classId].totalCredits += enrollment.credits_earned || 0;
          }
        });

        stats[subject.id] = {
          totalEnrollments,
          totalCredits,
          averageCredits: avgCredits,
          byClassGroup: byClass
        };
      }

      setSubjectStats(stats);
    } catch (err) {
      console.error('Error loading optional subjects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    setSelectedSubject(null);
    setSelectedClassGroup('all');
    await loadOptionalSubjects(yearId);
  };

  const handleClassGroupChange = (e) => {
    setSelectedClassGroup(e.target.value);
  };

  const viewEnrollments = async (subjectId) => {
    try {
      setLoading(true);
      setSelectedSubject(subjectId);

      // Load detailed enrollment data for the subject
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          id,
          credits_earned,
          term,
          students (
            id,
            name,
            email,
            class_groups (
              id,
              name
            )
          )
        `)
        .eq('subject_id', subjectId)
        .order('credits_earned', { ascending: false });

      if (enrollmentError) throw enrollmentError;
      setEnrollments(enrollmentData || []);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const handleUpdateCredits = async (enrollmentId, credits) => {
    try {
      // Update credits for the enrollment
      const { error } = await supabase
        .from('enrollments')
        .update({
          credits_earned: credits,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      // Refresh the enrollments data
      await viewEnrollments(selectedSubject);
      
      // Refresh subject stats
      await loadOptionalSubjects(selectedYear);
    } catch (err) {
      console.error('Error updating credits:', err);
      setError(err.message);
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

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%'
    }}>
      <header style={{
        backgroundColor: '#eab308', // Yellow color for credits
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
          }}>Optional Subject Credits</h1>
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
      </header>

      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        {/* Filters */}
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-end'
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

          {selectedSubject && (
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
                Filter by Class Group
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
                  color: '#374151',
                  backgroundColor: 'white'
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
          )}
        </div>

        {/* Content */}
        {selectedSubject ? (
          // Enrollment list view
          <div>
            <div style={{
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {optionalSubjects.find(s => s.id === selectedSubject)?.name} - Enrollments
              </h2>
              <button
                onClick={() => setSelectedSubject(null)}
                style={{ 
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Back to Subjects
              </button>
            </div>

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
                    }}>Student</th>
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
                    }}>Term</th>
                    <th style={{
                      textAlign: 'right',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments
                    .filter(enrollment => 
                      selectedClassGroup === 'all' || 
                      enrollment.students?.class_groups?.id === selectedClassGroup
                    )
                    .map((enrollment, index) => (
                      <tr key={enrollment.id} style={{
                        borderBottom: index < enrollments.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          {enrollment.students?.name}
                          {enrollment.students?.email && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280'
                            }}>
                              {enrollment.students.email}
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          <span style={{
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {enrollment.students?.class_groups?.name || 'Not Assigned'}
                          </span>
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151',
                          textAlign: 'center'
                        }}>
                          {enrollment.term || 'Full Year'}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          textAlign: 'right'
                        }}>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={enrollment.credits_earned || 0}
                            onChange={(e) => handleUpdateCredits(enrollment.id, parseInt(e.target.value, 10))}
                            style={{
                              width: '4rem',
                              padding: '0.25rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db',
                              textAlign: 'right'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Subject list view
          optionalSubjects.length === 0 ? (
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
                <BookOpen size={48} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                No Optional Subjects Found
              </h3>
              <p style={{
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                There are no optional subjects for the selected academic year.
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
                    }}>Subject</th>
                    <th style={{
                      textAlign: 'center',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>Students</th>
                    <th style={{
                      textAlign: 'center',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>Total Credits</th>
                    <th style={{
                      textAlign: 'center',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>Average Credits</th>
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
                  {optionalSubjects.map((subject, index) => (
                    <tr key={subject.id} style={{
                      borderBottom: index < optionalSubjects.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500'
                      }}>
                        {subject.name}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#374151',
                        textAlign: 'center'
                      }}>
                        {subjectStats[subject.id]?.totalEnrollments || 0}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#374151',
                        textAlign: 'center'
                      }}>
                        {subjectStats[subject.id]?.totalCredits || 0}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#374151',
                        textAlign: 'center'
                      }}>
                        {subjectStats[subject.id]?.averageCredits || 0}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'right'
                      }}>
                        <button
                          onClick={() => viewEnrollments(subject.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#eab308',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          View Enrollments
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>
    </div>
  );
}