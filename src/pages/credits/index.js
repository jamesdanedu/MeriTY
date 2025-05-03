import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ClockIcon, Briefcase,UserSearch, BookOpen, Award, ArrowRight, ShieldCheck } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CreditsHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [processing, setProcessing] = useState(false);

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
        
        // Check if user is an admin
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

        setIsAdmin(teacherData.is_admin);

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
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
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

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const handleFillAttendance = async () => {
    if (!selectedYear) return;
    
    try {
      setProcessing(true);

      // Get all students in the selected academic year
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, class_groups!inner(academic_year_id)')
        .eq('class_groups.academic_year_id', selectedYear);

      if (studentsError) throw studentsError;

      // For each student, create or update attendance records for both terms
      const terms = ['Term 1', 'Term 2'];
      const maxCredits = 10; // Max credits per term for attendance

      for (const student of students) {
        for (const term of terms) {
          // Check if record exists
          const { data: existing, error: checkError } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', student.id)
            .eq('period', term)
            .maybeSingle();

          if (checkError) throw checkError;

          if (existing) {
            // Update existing record
            await supabase
              .from('attendance')
              .update({
                credits_earned: maxCredits,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
          } else {
            // Create new record
            await supabase
              .from('attendance')
              .insert({
                student_id: student.id,
                period: term,
                credits_earned: maxCredits,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
          }
        }
      }

      setShowConfirmModal(false);
      alert('Successfully updated attendance credits for all students.');
    } catch (err) {
      console.error('Error filling attendance:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleFillWorkExperience = async () => {
    if (!selectedYear) return;
    
    try {
      setProcessing(true);

      // Get all students in the selected academic year
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, class_groups!inner(academic_year_id)')
        .eq('class_groups.academic_year_id', selectedYear);

      if (studentsError) throw studentsError;

      const maxCredits = 20; // Max credits for work experience
      const defaultDates = {
        start_date: '2024-01-15',
        end_date: '2024-01-26'
      };

      for (const student of students) {
        // Check if record exists
        const { data: existing, error: checkError } = await supabase
          .from('work_experience')
          .select('id')
          .eq('student_id', student.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
          // Update existing record
          await supabase
            .from('work_experience')
            .update({
              credits_earned: maxCredits,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Create new record
          await supabase
            .from('work_experience')
            .insert({
              student_id: student.id,
              business: 'Work Experience',
              start_date: defaultDates.start_date,
              end_date: defaultDates.end_date,
              credits_earned: maxCredits,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      }

      setShowConfirmModal(false);
      alert('Successfully updated work experience credits for all students.');
    } catch (err) {
      console.error('Error filling work experience:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleFillShortCourses = async () => {
    if (!selectedYear) return;
    
    try {
      setProcessing(true);

      // Get all students in the selected academic year
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, class_groups!inner(academic_year_id)')
        .eq('class_groups.academic_year_id', selectedYear);

      if (studentsError) throw studentsError;

      // Get all short courses for the year
      const { data: shortCourses, error: coursesError } = await supabase
        .from('subjects')
        .select('id, credit_value')
        .eq('academic_year_id', selectedYear)
        .eq('type', 'short');

      if (coursesError) throw coursesError;

      // For each student, create or update enrollments for all short courses
      for (const student of students) {
        for (const course of shortCourses) {
          // Check if enrollment exists
          const { data: existing, error: checkError } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', student.id)
            .eq('subject_id', course.id)
            .maybeSingle();

          if (checkError) throw checkError;

          if (existing) {
            // Update existing enrollment
            await supabase
              .from('enrollments')
              .update({
                credits_earned: course.credit_value,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
          } else {
            // Create new enrollment
            await supabase
              .from('enrollments')
              .insert({
                student_id: student.id,
                subject_id: course.id,
                credits_earned: course.credit_value,
                term: 'Full Year',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
          }
        }
      }

      setShowConfirmModal(false);
      alert('Successfully updated short course credits for all students.');
    } catch (err) {
      console.error('Error filling short courses:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAdminAction = (action) => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const executeConfirmedAction = () => {
    switch (confirmAction) {
      case 'attendance':
        handleFillAttendance();
        break;
      case 'workExperience':
        handleFillWorkExperience();
        break;
      case 'shortCourses':
        handleFillShortCourses();
        break;
    }
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const navigateTo = (path) => {
    window.location.href = path;
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
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '28rem',
            width: '100%',
            margin: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              Confirm Action
            </h3>
            <p style={{
              color: '#374151',
              marginBottom: '1.5rem'
            }}>
              Are you sure you want to set maximum credits for all students in the selected academic year? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={processing}
                style={{ 
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.7 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={processing}
                style={{ 
                  backgroundColor: '#eab308',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.7 : 1
                }}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          }}>Credits Management</h1>
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
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <label 
            htmlFor="yearFilter" 
            style={{ 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem',
              display: 'block'
            }}
          >
            Academic Year
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

        {/* Regular Credit Management Tools */}
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
          Credit Management
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div 
            onClick={() => navigateTo('/credits/by-class-groups')}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div style={{
                color: '#eab308',
                backgroundColor: '#fef3c7',
                padding: '0.5rem',
                borderRadius: '0.5rem'
              }}>
                <Award size={24} />
              </div>
              <ArrowRight size={20} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginTop: '1rem'
            }}>Credits by Class Group</h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>View and manage credits for entire class groups</p>
          </div>

          <div 
  onClick={() => navigateTo('/credits/by-student')}
  style={{
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    cursor: 'pointer',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  }}
>
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start'
  }}>
    <div style={{
      color: '#eab308',
      backgroundColor: '#fef3c7',
      padding: '0.5rem',
      borderRadius: '0.5rem'
    }}>
      <UserSearch size={24} />
    </div>
    <ArrowRight size={20} style={{ color: '#9ca3af' }} />
  </div>
  <h3 style={{
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    marginTop: '1rem'
  }}>Credits by Student</h3>
  <p style={{
    color: '#6b7280',
    fontSize: '0.875rem',
    marginTop: '0.5rem'
  }}>Search and manage credits for individual students</p>
</div>

          <div 
            onClick={() => navigateTo('/credits/by-optional-subject')}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div style={{
                color: '#eab308',
                backgroundColor: '#fef3c7',
                padding: '0.5rem',
                borderRadius: '0.5rem'
              }}>
                <BookOpen size={24} />
              </div>
              <ArrowRight size={20} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginTop: '1rem'
            }}>Credits by Subject</h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>Manage credits for optional subject enrollments</p>
          </div>
        </div>

        {/* Admin Tools Section */}
        {isAdmin && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              marginTop: '2rem'
            }}>
              <ShieldCheck size={20} style={{ color: '#eab308' }} />
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                Administrator Tools
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              <div 
                onClick={() => handleAdminAction('attendance')}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  opacity: processing ? 0.7 : 1
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start'
                }}>
                  <div style={{
                    color: '#eab308',
                    backgroundColor: '#fef3c7',
                    padding: '0.5rem',
                    borderRadius: '0.5rem'
                  }}>
                    <ClockIcon size={24} />
                  </div>
                  <ArrowRight size={20} style={{ color: '#9ca3af' }} />
                </div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginTop: '1rem'
                }}>Quick Fill Attendance Credits</h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>Set maximum attendance credits for all students</p>
              </div>

              <div 
                onClick={() => handleAdminAction('workExperience')}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  opacity: processing ? 0.7 : 1
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start'
                }}>
                  <div style={{
                    color: '#eab308',
                    backgroundColor: '#fef3c7',
                    padding: '0.5rem',
                    borderRadius: '0.5rem'
                  }}>
                    <Briefcase size={24} />
                  </div>
                  <ArrowRight size={20} style={{ color: '#9ca3af' }} />
                </div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginTop: '1rem'
                }}>Quick Fill Work Experience Credits</h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>Set maximum work experience credits for all students</p>
              </div>

              <div 
                onClick={() => handleAdminAction('shortCourses')}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  opacity: processing ? 0.7 : 1
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start'
                }}>
                  <div style={{
                    color: '#eab308',
                    backgroundColor: '#fef3c7',
                    padding: '0.5rem',
                    borderRadius: '0.5rem'
                  }}>
                    <BookOpen size={24} />
                  </div>
                  <ArrowRight size={20} style={{ color: '#9ca3af' }} />
                </div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginTop: '1rem'
                }}>Quick Fill Short Module Credits</h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}>Set maximum credits for all short course enrollments</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}