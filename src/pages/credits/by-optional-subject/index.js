import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Book, Users, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';
import { useRouter } from 'next/router';
import { getSession } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CreditsBySubject() {
  const router = useRouter();
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Data state
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classGroups, setClassGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Create a state for tracking credit changes
  const [creditChanges, setCreditChanges] = useState({});
  
  // Save notifications
  const [saveNotification, setSaveNotification] = useState({ visible: false, type: 'success', message: '' });

  // Autosave timer
  const autosaveTimerRef = useRef(null);
  const AUTOSAVE_INTERVAL = 60000; // 1 minute

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Check authentication using the auth utility
        const { session } = await getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);
        
        // Check if user is a teacher
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (teacherError) throw teacherError;
        if (!teacherData) {
          router.push('/login');
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
          await loadSubjectsAndTypes(currentYear.id);
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadSubjectsAndTypes(yearsData[0].id);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
    
    // Clear autosave timer on component unmount
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [router]);

  // Setup autosave whenever there are changes
  useEffect(() => {
    if (hasChanges) {
      // Clear any existing timer
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      
      // Set a new timer for autosave
      autosaveTimerRef.current = setTimeout(() => {
        saveChanges(true); // Pass true to indicate it's an autosave
      }, AUTOSAVE_INTERVAL);
    }
    
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [hasChanges, creditChanges]);

  const loadSubjectsAndTypes = async (yearId) => {
    try {
      setLoading(true);
      
      // Get only optional subjects for the selected year
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('academic_year_id', yearId)
        .eq('type', 'optional')  // Only load optional subjects
        .order('name');
        
      if (subjectsError) throw subjectsError;
      setSubjects(subjects || []);
      
      // Get class groups for the year
      const { data: classGroupsData, error: classGroupsError } = await supabase
        .from('class_groups')
        .select('*')
        .eq('academic_year_id', yearId)
        .order('name');
        
      if (classGroupsError) throw classGroupsError;
      setClassGroups(classGroupsData || []);
      
      // Initialize expanded state for class groups
      const newExpandedState = {};
      classGroupsData?.forEach(group => {
        newExpandedState[group.id] = expandedGroups[group.id] || false;
      });
      setExpandedGroups(newExpandedState);
      
      // If there are subjects, select the first one by default
      if (subjects && subjects.length > 0) {
        setSelectedSubject(subjects[0].id);
        await loadEnrollmentsBySubject(subjects[0].id);
      }
    } catch (err) {
      console.error('Error loading subjects and types:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollmentsBySubject = async (subjectId) => {
    if (!subjectId) return;

    try {
      setLoading(true);
      setCreditChanges({}); // Reset credit changes
      setHasChanges(false);
      
      // Get enrollments for the selected subject
      const { data: enrollmentData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          subject_id,
          term1_credits,
          term2_credits,
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
      
      if (!enrollmentData || enrollmentData.length === 0) {
        setEnrollments([]);
        setLoading(false);
        return;
      }
      
      // Organize students by class group
      const studentsByGroup = {};
      
      enrollmentData.forEach(enrollment => {
        if (!enrollment.students) return; // Skip if student data is missing
        
        const student = enrollment.students;
        const groupId = student.class_group_id;
        
        if (!groupId) return; // Skip if no class group assigned
        
        if (!studentsByGroup[groupId]) {
          studentsByGroup[groupId] = {
            id: groupId,
            name: student.class_groups?.name || 'Unknown Class',
            students: []
          };
        }
        
        studentsByGroup[groupId].students.push({
          id: student.id,
          name: student.name,
          email: student.email,
          enrollment_id: enrollment.id,
          term1_credits: enrollment.term1_credits || 0,
          term2_credits: enrollment.term2_credits || 0
        });
      });
      
      // Convert to array and sort students within each group
      const groupedData = Object.values(studentsByGroup);
      
      groupedData.forEach(group => {
        group.students.sort((a, b) => a.name.localeCompare(b.name));
      });
      
      setEnrollments(groupedData);
    } catch (err) {
      console.error('Error loading enrollments by subject:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = async (e) => {
    // Check if there are unsaved changes
    if (hasChanges) {
      const confirmChange = window.confirm("You have unsaved changes. Do you want to save them before continuing?");
      if (confirmChange) {
        await saveChanges();
      }
    }
    
    const yearId = parseInt(e.target.value, 10);
    setSelectedYear(yearId);
    setSelectedSubject('');
    setEnrollments([]);
    await loadSubjectsAndTypes(yearId);
  };

  const handleSubjectChange = async (e) => {
    // Check if there are unsaved changes
    if (hasChanges) {
      const confirmChange = window.confirm("You have unsaved changes. Do you want to save them before continuing?");
      if (confirmChange) {
        await saveChanges();
      }
    }
    
    const subjectId = e.target.value;
    setSelectedSubject(subjectId);
    
    if (subjectId) {
      await loadEnrollmentsBySubject(subjectId);
    } else {
      setEnrollments([]);
    }
  };

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleCreditChange = (studentId, term, value) => {
    // Update tracking state for credit changes
    setCreditChanges(prev => ({
      ...prev,
      [`${studentId}-${term}`]: value
    }));
    
    // Mark that changes have been made
    setHasChanges(true);
  };

  const showSaveNotification = (type, message) => {
    setSaveNotification({
      visible: true,
      type,
      message
    });
    
    // Hide the notification after 5 seconds
    setTimeout(() => {
      setSaveNotification({ visible: false, type: 'success', message: '' });
    }, 5000);
  };

  const saveChanges = async (isAutosave = false) => {
    if (!hasChanges) return;
    
    try {
      setIsSaving(true);
      
      // Prepare updates to be made
      const updates = [];
      
      // Process each enrollment
      enrollments.forEach(group => {
        group.students.forEach(student => {
          // Check if either term's credits have changed
          const term1Key = `${student.id}-term1`;
          const term2Key = `${student.id}-term2`;
          
          const term1Changed = creditChanges[term1Key] !== undefined;
          const term2Changed = creditChanges[term2Key] !== undefined;
          
          if (term1Changed || term2Changed) {
            // Calculate new credit values
            const term1Credits = term1Changed 
              ? parseInt(creditChanges[term1Key], 10) || 0 
              : student.term1_credits;
              
            const term2Credits = term2Changed
              ? parseInt(creditChanges[term2Key], 10) || 0
              : student.term2_credits;
            
            // Add to updates list
            updates.push({
              studentId: student.id,
              enrollmentId: student.enrollment_id,
              term1Credits,
              term2Credits
            });
          }
        });
      });
      
      // Current timestamp for updates
      const now = new Date().toISOString();
      
      // Process all updates
      for (const update of updates) {
        // Since we're only showing enrolled students, all students should have an enrollment_id
        // Update existing enrollment
        const { error } = await supabase
          .from('enrollments')
          .update({
            term1_credits: update.term1Credits,
            term2_credits: update.term2Credits,
            updated_at: now
          })
          .eq('id', update.enrollmentId);
          
        if (error) throw error;
      }
      
      // Reload data after saving to get the latest state
      await loadEnrollmentsBySubject(selectedSubject);
      
      // Show success message
      showSaveNotification('success', isAutosave ? 'Changes autosaved successfully!' : 'Credits saved successfully!');
      
      return true;
    } catch (err) {
      console.error('Error saving credits:', err);
      setError(err.message);
      showSaveNotification('error', 'Error saving credits: ' + err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    // Check if there are unsaved changes
    if (hasChanges) {
      const confirmLeave = window.confirm("You have unsaved changes. Do you want to save them before leaving?");
      if (confirmLeave) {
        saveChanges().then(() => {
          router.push('/credits');
        });
        return;
      }
    }
    
    router.push('/credits');
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
          maxWidth: '100%',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white'
          }}>MeriTY - Assign Credits by Optional Subject</h1>
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
        maxWidth: '100%',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        {/* Save Notification */}
        {saveNotification.visible && (
          <div style={{
            position: 'fixed',
            top: '4.5rem',
            right: '1.5rem',
            backgroundColor: saveNotification.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: saveNotification.type === 'success' ? '#166534' : '#b91c1c',
            padding: '1rem',
            borderRadius: '0.375rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {saveNotification.type === 'success' ? (
              <Check size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{saveNotification.message}</span>
          </div>
        )}
      
        {/* Autosave Indicator */}
        {hasChanges && (
          <div style={{
            backgroundColor: '#fff9db',
            color: '#92400e',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div>
              <span style={{ fontWeight: '500' }}>Unsaved changes</span> - 
              {isSaving ? (
                <span> Saving changes...</span>
              ) : (
                <span> Changes will be autosaved in {Math.round(AUTOSAVE_INTERVAL / 1000)} seconds</span>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          marginBottom: '1.5rem',
          backgroundColor: 'white',
          padding: '1.25rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'flex-end'
          }}>
            {/* Academic Year Filter */}
            <div style={{ flex: 1, minWidth: '200px' }}>
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
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#374151',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Year</option>
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label 
                htmlFor="subjectSelect" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Optional Subject
              </label>
              <select
                id="subjectSelect"
                value={selectedSubject}
                onChange={handleSubjectChange}
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
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div>
              <button
                onClick={() => saveChanges()}
                disabled={!hasChanges || isSaving}
                style={{ 
                  backgroundColor: hasChanges ? '#eab308' : '#f3f4f6',
                  color: hasChanges ? 'white' : '#9ca3af',
                  fontWeight: '500',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  height: '38px'
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* No subject selected message */}
        {!selectedSubject && (
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
              <Book size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Please Select a Subject
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              Select a subject from the dropdown above to view and manage credits.
            </p>
          </div>
        )}

        {/* Class Groups */}
        {selectedSubject && (
          enrollments.length === 0 ? (
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
                <Users size={48} style={{ margin: '0 auto' }} />
              </div>
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
                There are no students enrolled in this subject for the selected criteria.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {enrollments.map(group => (
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
                              color: '#374151',
                              width: '150px'
                            }}>Term 1</th>
                            <th style={{
                              textAlign: 'center',
                              padding: '0.75rem 1.5rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#374151',
                              width: '150px'
                            }}>Term 2</th>
                            <th style={{
                              textAlign: 'center',
                              padding: '0.75rem 1.5rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#374151',
                              width: '150px'
                            }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.students.map((student, index) => (
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
                                textAlign: 'center'
                              }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={
                                    creditChanges[`${student.id}-term1`] !== undefined
                                      ? creditChanges[`${student.id}-term1`]
                                      : student.term1_credits
                                  }
                                  onChange={(e) => handleCreditChange(student.id, 'term1', e.target.value)}
                                  style={{
                                    width: '5rem',
                                    padding: '0.375rem',
                                    borderRadius: '0.25rem',
                                    border: '1px solid #d1d5db',
                                    textAlign: 'center',
                                    backgroundColor: creditChanges[`${student.id}-term1`] !== undefined ? '#fffbeb' : 'white'
                                  }}
                                />
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'center'
                              }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={
                                    creditChanges[`${student.id}-term2`] !== undefined
                                      ? creditChanges[`${student.id}-term2`]
                                      : student.term2_credits
                                  }
                                  onChange={(e) => handleCreditChange(student.id, 'term2', e.target.value)}
                                  style={{
                                    width: '5rem',
                                    padding: '0.375rem',
                                    borderRadius: '0.25rem',
                                    border: '1px solid #d1d5db',
                                    textAlign: 'center',
                                    backgroundColor: creditChanges[`${student.id}-term2`] !== undefined ? '#fffbeb' : 'white'
                                  }}
                                />
                              </td>
                              <td style={{
                                padding: '1rem 1.5rem',
                                textAlign: 'center',
                                fontWeight: '500',
                                color: '#111827'
                              }}>
                                {(creditChanges[`${student.id}-term1`] !== undefined
                                  ? parseInt(creditChanges[`${student.id}-term1`], 10) || 0
                                  : student.term1_credits) +
                                 (creditChanges[`${student.id}-term2`] !== undefined
                                  ? parseInt(creditChanges[`${student.id}-term2`], 10) || 0
                                  : student.term2_credits)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}