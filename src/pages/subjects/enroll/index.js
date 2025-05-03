import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BookOpen, Upload, Search, UserMinus, ArrowRight, X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function OptionalSubjectEnrollment() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [optionalSubjects, setOptionalSubjects] = useState([]);
  const [subjectEnrollments, setSubjectEnrollments] = useState({});
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sourceSubject, setSourceSubject] = useState(null);
  const [targetSubject, setTargetSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
        
        // Load academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);
        
        // Set default to current academic year if available
        const currentYear = yearsData?.find(year => year.is_current);
        if (currentYear) {
          setSelectedYear(currentYear.id);
        } else if (yearsData && yearsData.length > 0) {
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

  useEffect(() => {
    // Load optional subjects and enrollment data when selectedYear changes
    async function loadSubjectsAndEnrollments() {
      if (!selectedYear) return;
      
      setLoading(true);
      try {
        // Load optional subjects for the selected year
        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('academic_year_id', selectedYear)
          .eq('type', 'optional')
          .order('name');
          
        if (subjectsError) throw subjectsError;
        setOptionalSubjects(subjects || []);
        
        // Load enrollment counts for each subject
        const enrollmentData = {};
        
        if (subjects && subjects.length > 0) {
          for (const subject of subjects) {
            // Get enrollments for this subject
            const { count, error: enrollmentsError } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('subject_id', subject.id);
              
            if (enrollmentsError) throw enrollmentsError;
            
            // Calculate credits earned for this subject
            const { data: creditsData, error: creditsError } = await supabase
              .from('enrollments')
              .select('credits_earned')
              .eq('subject_id', subject.id);
              
            if (creditsError) throw creditsError;
            
            const totalCreditsEarned = creditsData?.reduce((sum, enrollment) => 
              sum + (enrollment.credits_earned || 0), 0
            ) || 0;
            
            enrollmentData[subject.id] = {
              count: count || 0,
              maxCredits: subject.credit_value * count,
              totalCreditsEarned: totalCreditsEarned
            };
          }
        }
        
        setSubjectEnrollments(enrollmentData);
      } catch (err) {
        console.error('Error loading subjects:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadSubjectsAndEnrollments();
  }, [selectedYear]);
  
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setSelectedSubject(null);
    setStudents([]);
  };
  
  const handleSubjectClick = async (subjectId) => {
    setSelectedSubject(subjectId);
    
    try {
      setLoading(true);
      
      // Get all students enrolled in this subject
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          credits_earned,
          term,
          students (
            id,
            name,
            email,
            class_group_id,
            class_groups (
              id,
              name
            )
          )
        `)
        .eq('subject_id', subjectId);
       
      if (enrollmentsError) throw enrollmentsError;
      
      // Transform enrollments data to student list with enrollment details
      const enrolledStudents = enrollments?.map(enrollment => ({
        id: enrollment.students.id,
        name: enrollment.students.name,
        email: enrollment.students.email,
        classGroup: enrollment.students.class_groups?.name || 'Not Assigned',
        enrollmentId: enrollment.id,
        creditsEarned: enrollment.credits_earned || 0,
        term: enrollment.term || 'Full Year',
        teacherName: enrollment.teachers?.name || 'Not Assigned'
      })) || [];
      
      setStudents(enrolledStudents);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const openMoveModal = (student, fromSubjectId) => {
    setSelectedStudent(student);
    setSourceSubject(fromSubjectId);
    setTargetSubject(null);
    setShowMoveModal(true);
  };
  
  const handleMoveStudent = async () => {
    if (!selectedStudent || !sourceSubject || !targetSubject) {
      return;
    }
    
    try {
      setLoading(true);
      
      // First, get the enrollment record for the source subject
      const { data: sourceEnrollment, error: sourceError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .eq('subject_id', sourceSubject)
        .single();
        
      if (sourceError) throw sourceError;
      
      // Check if the student is already enrolled in the target subject
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .eq('subject_id', targetSubject)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingEnrollment) {
        // If already enrolled in target, just delete source enrollment
        const { error: deleteError } = await supabase
          .from('enrollments')
          .delete()
          .eq('id', sourceEnrollment.id);
          
        if (deleteError) throw deleteError;
      } else {
        // Otherwise update the existing enrollment
        const { error: updateError } = await supabase
          .from('enrollments')
          .update({
            subject_id: targetSubject,
            updated_at: new Date()
          })
          .eq('id', sourceEnrollment.id);
          
        if (updateError) throw updateError;
      }
      
      // Refresh the data
      await handleSubjectClick(sourceSubject);
      
      // Update the enrollment counts
      const updatedEnrollments = { ...subjectEnrollments };
      if (updatedEnrollments[sourceSubject]) {
        updatedEnrollments[sourceSubject] = {
          ...updatedEnrollments[sourceSubject],
          count: Math.max(0, (updatedEnrollments[sourceSubject].count || 0) - 1)
        };
      }
      
      if (updatedEnrollments[targetSubject]) {
        updatedEnrollments[targetSubject] = {
          ...updatedEnrollments[targetSubject],
          count: (updatedEnrollments[targetSubject].count || 0) + 1
        };
      }
      
      setSubjectEnrollments(updatedEnrollments);
      
      // Close the modal
      setShowMoveModal(false);
      setSelectedStudent(null);
      setSourceSubject(null);
      setTargetSubject(null);
      
    } catch (err) {
      console.error('Error moving student:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Updated route for enrolling students - direct to subject-specific enrollment page
  const handleEnrollment = (subjectId) => {
    window.location.href = `/subjects/enroll/${subjectId}/import`;
  };
  
  const handleRemoveEnrollment = async (enrollmentId) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);
        
      if (error) throw error;
      
      // Update enrollment counts
      const updatedEnrollments = { ...subjectEnrollments };
      if (updatedEnrollments[selectedSubject]) {
        updatedEnrollments[selectedSubject] = {
          ...updatedEnrollments[selectedSubject],
          count: Math.max(0, (updatedEnrollments[selectedSubject].count || 0) - 1)
        };
      }
      
      setSubjectEnrollments(updatedEnrollments);
      
      // Refresh the student list
      await handleSubjectClick(selectedSubject);
      
    } catch (err) {
      console.error('Error removing enrollment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const goBackToSubjects = () => {
    window.location.href = '/subjects';
  };

  if (loading && !students.length) {
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
      {/* Move Student Modal */}
      {showMoveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '28rem',
            margin: '0 1rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              Move Student to Another Subject
            </h3>
            <p style={{
              color: '#4b5563',
              marginBottom: '1.5rem'
            }}>
              Move <strong>{selectedStudent?.name}</strong> from{' '}
              <strong>{optionalSubjects.find(s => s.id === sourceSubject)?.name || 'Current Subject'}</strong> to:
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="targetSubject" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Target Subject *
              </label>
              <select
                id="targetSubject"
                value={targetSubject || ''}
                onChange={(e) => setTargetSubject(e.target.value)}
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Subject</option>
                {optionalSubjects
                  .filter(subject => subject.id !== sourceSubject)
                  .map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))
                }
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowMoveModal(false)}
                style={{ 
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMoveStudent}
                disabled={!targetSubject}
                style={{ 
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: !targetSubject ? 'not-allowed' : 'pointer',
                  opacity: !targetSubject ? 0.7 : 1
                }}
              >
                Move Student
              </button>
            </div>
          </div>
        </div>
      )}
            
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
          }}>Optional Subject Enrollment</h1>
          <div style={{
            display: 'flex',
            gap: '0.75rem'
          }}>
            <button
              onClick={goBackToSubjects}
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
        </div>
      </header>
      
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
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
            <button
              onClick={() => setError(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#b91c1c',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '0.25rem 0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.5rem'
              }}
            >
              <X size={16} />
              Dismiss
            </button>
          </div>
        )}
        
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
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
        
        <p style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          marginBottom: '1.5rem'
        }}>
          Manage optional subject enrollments for students. Click on a subject to view or modify its enrollments.
        </p>
        
        {selectedSubject ? (
          // Show enrollments for selected subject
          <div>
            <div style={{
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {optionalSubjects.find(s => s.id === selectedSubject)?.name || 'Subject'} Enrollments
              </h3>
              
              <div style={{
                display: 'flex',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => handleEnrollment(selectedSubject)}
                  style={{ 
                    backgroundColor: '#10b981',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Upload size={16} />
                  Enrollment
                </button>
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              marginBottom: '1.5rem'
            }}>
              {loading ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  Loading enrollments...
                </div>
              ) : students.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  No students enrolled in this subject.
                </div>
              ) : (
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
                          color: '#374151'
                        }}>
                          Name
                        </th>
                        <th style={{
                          textAlign: 'left',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Class Group
                        </th>
                        <th style={{
                          textAlign: 'left',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Term
                        </th>
                        <th style={{
                          textAlign: 'left',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Credits Earned
                        </th>
                        <th style={{
                          textAlign: 'right',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Actions
                        </th>
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
                            {student.email && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280'
                              }}>
                                {student.email}
                              </div>
                            )}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#374151'
                          }}>
                            {student.classGroup}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#374151'
                          }}>
                            {student.term}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#374151'
                          }}>
                            {student.creditsEarned}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            textAlign: 'right',
                            whiteSpace: 'nowrap'
                          }}>
                            <button
                              onClick={() => openMoveModal(student, selectedSubject)}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#7c3aed',
                                fontWeight: '500',
                                cursor: 'pointer',
                                marginRight: '1rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <ArrowRight size={16} />
                              Move
                            </button>
                            <button
                              onClick={() => handleRemoveEnrollment(student.enrollmentId)}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <UserMinus size={16} />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                setSelectedSubject(null);
                setStudents([]);
              }}
              style={{ 
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                cursor: 'pointer'
              }}
            >
              Back to Subjects List
            </button>
          </div>
        ) : (
          // Show subject list
          <div>
            {loading ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280' }}>Loading subjects...</p>
              </div>
            ) : optionalSubjects.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '4rem',
                  color: '#9ca3af',
                  marginBottom: '1rem'
                }}>
                  <BookOpen size={64} style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827',
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
                <button
                  onClick={goBackToSubjects}
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
                  Add Optional Subjects
                </button>
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
                          color: '#374151'
                        }}>
                          Subject Name
                        </th>
                        <th style={{
                          textAlign: 'left',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Credit Value
                        </th>
                        <th style={{
                          textAlign: 'left',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Students Enrolled
                        </th>
                        <th style={{
                          textAlign: 'left',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Total Credits
                        </th>
                        <th style={{
                          textAlign: 'right',
                          padding: '0.75rem 1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {optionalSubjects.map((subject, index) => (
                        <tr 
                          key={subject.id} 
                          style={{
                            borderBottom: index < optionalSubjects.length - 1 ? '1px solid #e5e7eb' : 'none',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleSubjectClick(subject.id)}
                        >
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
                            color: '#374151'
                          }}>
                            {subject.credit_value}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#374151'
                          }}>
                            {subjectEnrollments[subject.id]?.count || 0}
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            color: '#374151'
                          }}>
                            <span title="Credits Earned / Maximum Credits">
                              {subjectEnrollments[subject.id]?.totalCreditsEarned || 0} / {subjectEnrollments[subject.id]?.maxCredits || 0}
                            </span>
                          </td>
                          <td style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.875rem',
                            textAlign: 'right'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnrollment(subject.id);
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#10b981',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Upload size={16} />
                              Enrollment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}