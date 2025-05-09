import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { School, BookOpen, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { useRouter } from 'next/router';
import { getSession } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CreditsByClassGroup() {
  const router = useRouter();
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Data state
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classGroups, setClassGroups] = useState([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Create a state for tracking credit changes
  const [creditChanges, setCreditChanges] = useState({});

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
          await loadClassGroupsAndSubjects(currentYear.id);
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadClassGroupsAndSubjects(yearsData[0].id);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [router]);

  const loadClassGroupsAndSubjects = async (yearId) => {
    try {
      setLoading(true);
      
      // Get class groups for the selected year
      const { data: groups, error: groupsError } = await supabase
        .from('class_groups')
        .select('*')
        .eq('academic_year_id', yearId)
        .order('name');
        
      if (groupsError) throw groupsError;
      setClassGroups(groups || []);

      // Get core subjects for the selected year
      const { data: coreSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('academic_year_id', yearId)
        .eq('type', 'core') // Only core subjects
        .order('name');
        
      if (subjectsError) throw subjectsError;
      setSubjects(coreSubjects || []);

      // Initialize expanded state for new groups
      const newExpandedState = {};
      groups.forEach(group => {
        newExpandedState[group.id] = expandedGroups[group.id] || false;
      });
      setExpandedGroups(newExpandedState);

      // If there are subjects, select the first one by default
      if (coreSubjects && coreSubjects.length > 0) {
        setSelectedSubject(coreSubjects[0].id);
        // Load enrollments for the first subject
        await loadEnrollments(yearId, 'all', coreSubjects[0].id);
      }
    } catch (err) {
      console.error('Error loading class groups and subjects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async (yearId, classGroupId, subjectId) => {
    if (!yearId || !subjectId) return;

    try {
      setLoading(true);
      setCreditChanges({}); // Reset credit changes
      setHasChanges(false);
      
      // Build query to get enrollments for the selected subject
      let query = supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          subject_id,
          term,
          credits_earned,
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

      // If a specific class group is selected, filter by it
      if (classGroupId !== 'all') {
        query = query.eq('students.class_group_id', classGroupId);
      } else {
        // If all class groups, filter by academic year through class groups
        const { data: classGroupIds } = await supabase
          .from('class_groups')
          .select('id')
          .eq('academic_year_id', yearId);
        
        if (classGroupIds && classGroupIds.length > 0) {
          const ids = classGroupIds.map(g => g.id);
          query = query.in('students.class_group_id', ids);
        }
      }
      
      // Execute the query
      const { data, error } = await query;
        
      if (error) throw error;

      // Process enrollments and group by student
      const processedEnrollments = {};
      
      // Initialize enrollments for each student
      if (data) {
        data.forEach(enrollment => {
          if (!enrollment.students) return; // Skip if no student data
          
          const studentId = enrollment.student_id;
          const term = enrollment.term;
          
          if (!processedEnrollments[studentId]) {
            processedEnrollments[studentId] = {
              id: studentId,
              name: enrollment.students.name,
              email: enrollment.students.email,
              class_group_id: enrollment.students.class_group_id,
              class_group_name: enrollment.students.class_groups?.name,
              term1: { id: null, credits: 0 },
              term2: { id: null, credits: 0 }
            };
          }
          
          // Set term-specific data
          if (term === 'Term 1') {
            processedEnrollments[studentId].term1 = {
              id: enrollment.id,
              credits: enrollment.credits_earned || 0
            };
          } else if (term === 'Term 2') {
            processedEnrollments[studentId].term2 = {
              id: enrollment.id,
              credits: enrollment.credits_earned || 0
            };
          }
        });
      }
      
      // Convert to array and sort by name
      const enrollmentsArray = Object.values(processedEnrollments);
      enrollmentsArray.sort((a, b) => a.name.localeCompare(b.name));
      
      // Group by class group
      const grouped = {};
      
      enrollmentsArray.forEach(enrollment => {
        const groupId = enrollment.class_group_id;
        if (!groupId) return;
        
        if (!grouped[groupId]) {
          grouped[groupId] = {
            id: groupId,
            name: enrollment.class_group_name || 'Unknown Class',
            students: []
          };
        }
        
        grouped[groupId].students.push(enrollment);
      });
      
      setEnrollments(Object.values(grouped));
      
      // Expand all groups by default
      const newExpandedState = {};
      Object.keys(grouped).forEach(groupId => {
        newExpandedState[groupId] = true;
      });
      setExpandedGroups(newExpandedState);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = async (e) => {
    const yearId = parseInt(e.target.value, 10);
    setSelectedYear(yearId);
    setSelectedClassGroup('all');
    // Reset subject selection
    setSelectedSubject('');
    await loadClassGroupsAndSubjects(yearId);
  };

  const handleClassGroupChange = async (e) => {
    const groupId = e.target.value;
    setSelectedClassGroup(groupId);
    await loadEnrollments(selectedYear, groupId, selectedSubject);
  };

  const handleSubjectChange = async (e) => {
    const subjectId = e.target.value;
    setSelectedSubject(subjectId);
    await loadEnrollments(selectedYear, selectedClassGroup, subjectId);
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

  const saveChanges = async () => {
    if (!hasChanges) return;
    
    try {
      setIsSaving(true);
      
      // Prepare updates to be made
      const updates = [];
      
      // Process each enrollment
      enrollments.forEach(group => {
        group.students.forEach(student => {
          // Check term 1
          const term1Key = `${student.id}-term1`;
          if (creditChanges[term1Key] !== undefined) {
            if (student.term1.id) {
              // Update existing enrollment
              updates.push({
                id: student.term1.id,
                credits: parseInt(creditChanges[term1Key], 10) || 0,
                isUpdate: true
              });
            } else {
              // Create new enrollment
              updates.push({
                student_id: student.id,
                subject_id: selectedSubject,
                term: 'Term 1',
                credits: parseInt(creditChanges[term1Key], 10) || 0,
                isUpdate: false
              });
            }
          }
          
          // Check term 2
          const term2Key = `${student.id}-term2`;
          if (creditChanges[term2Key] !== undefined) {
            if (student.term2.id) {
              // Update existing enrollment
              updates.push({
                id: student.term2.id,
                credits: parseInt(creditChanges[term2Key], 10) || 0,
                isUpdate: true
              });
            } else {
              // Create new enrollment
              updates.push({
                student_id: student.id,
                subject_id: selectedSubject,
                term: 'Term 2',
                credits: parseInt(creditChanges[term2Key], 10) || 0,
                isUpdate: false
              });
            }
          }
        });
      });
      
      // Process all updates
      const now = new Date().toISOString();
      
      for (const update of updates) {
        if (update.isUpdate) {
          // Update existing enrollment
          const { error } = await supabase
            .from('enrollments')
            .update({
              credits_earned: update.credits,
              updated_at: now
            })
            .eq('id', update.id);
            
          if (error) throw error;
        } else {
          // Create new enrollment
          const { error } = await supabase
            .from('enrollments')
            .insert({
              student_id: update.student_id,
              subject_id: update.subject_id,
              term: update.term,
              credits_earned: update.credits,
              created_at: now,
              updated_at: now
            });
            
          if (error) throw error;
        }
      }
      
      // Reload data after saving
      await loadEnrollments(selectedYear, selectedClassGroup, selectedSubject);
      
      // Show success message
      alert('Credits saved successfully!');
    } catch (err) {
      console.error('Error saving credits:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
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
          }}>MeriTY - Assign credits by class group [core subjects]</h1>
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
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Group Filter */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label 
                htmlFor="classGroupSelect" 
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
                id="classGroupSelect"
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
                Subject
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
                onClick={saveChanges}
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
              <BookOpen size={48} style={{ margin: '0 auto' }} />
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
              Select a core subject from the dropdown above to view and manage credits.
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
                <School size={48} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                No Enrollments Found
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
                                      : student.term1.credits
                                  }
                                  onChange={(e) => handleCreditChange(student.id, 'term1', e.target.value)}
                                  style={{
                                    width: '5rem',
                                    padding: '0.375rem',
                                    borderRadius: '0.25rem',
                                    border: '1px solid #d1d5db',
                                    textAlign: 'center'
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
                                      : student.term2.credits
                                  }
                                  onChange={(e) => handleCreditChange(student.id, 'term2', e.target.value)}
                                  style={{
                                    width: '5rem',
                                    padding: '0.375rem',
                                    borderRadius: '0.25rem',
                                    border: '1px solid #d1d5db',
                                    textAlign: 'center'
                                  }}
                                />
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