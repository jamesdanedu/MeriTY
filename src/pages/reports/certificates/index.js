// src/pages/reports/certificates/index.js
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Award, ArrowLeft, Download, Printer, Search, Users } from 'lucide-react';
import { withAuth } from '@/contexts/withAuth';
import { generateCertificate, printCertificate, batchGenerateCertificates, saveCertificateAsPDF } from './generate';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Grade calculation function
function calculateGrade(totalCredits, maxPossibleCredits) {
  if (maxPossibleCredits === 0) return 'Fail';
  
  const percentage = (totalCredits / maxPossibleCredits) * 100;
  
  if (percentage < 40) return 'Fail';
  if (percentage < 55) return 'Pass';
  if (percentage < 70) return 'Merit II';
  if (percentage < 85) return 'Merit I';
  return 'Distinction';
}

function CertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [academicYears, setAcademicYears] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        
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
      setSelectedClassGroup('all'); // Reset selection when year changes
    } catch (err) {
      console.error('Error loading class groups:', err);
      setError(err.message);
    }
  };

  // Using multiple simpler queries and updated for term1_credits and term2_credits
  const loadStudents = async (yearId) => {
    try {
      // Step 1: Fetch basic student data
      let studentQuery = supabase
        .from('students')
        .select('id, name, email, class_group_id')
        .order('name');
      
      // Apply filters
      if (selectedClassGroup !== 'all') {
        studentQuery = studentQuery.eq('class_group_id', selectedClassGroup);
      } else {
        // Only filter by class groups in the selected academic year
        const { data: relevantClassGroups } = await supabase
          .from('class_groups')
          .select('id')
          .eq('academic_year_id', yearId);
        
        if (relevantClassGroups && relevantClassGroups.length > 0) {
          const classGroupIds = relevantClassGroups.map(cg => cg.id);
          studentQuery = studentQuery.in('class_group_id', classGroupIds);
        }
      }

      // Apply search term if exists
      if (searchTerm) {
        studentQuery = studentQuery.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: students, error: studentsError } = await studentQuery;
      
      if (studentsError) throw studentsError;
      if (!students || students.length === 0) {
        setStudents([]);
        return;
      }

      // Step 2: Fetch class group details for these students
      const classGroupIds = [...new Set(students.filter(s => s.class_group_id).map(s => s.class_group_id))];
      
      let classGroupsData = [];
      if (classGroupIds.length > 0) {
        const { data: classGroupDetails, error: classGroupsError } = await supabase
          .from('class_groups')
          .select('id, name')
          .in('id', classGroupIds);
          
        if (classGroupsError) throw classGroupsError;
        classGroupsData = classGroupDetails || [];
      }

      // Step 3: Fetch all enrollments for the students
      // Using term1_credits and term2_credits
      const studentIds = students.map(s => s.id);
      const { data: allEnrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, student_id, subject_id, term1_credits, term2_credits')
        .in('student_id', studentIds);
        
      if (enrollmentsError) throw enrollmentsError;
      const enrollments = allEnrollments || [];

      // Step 4: Fetch all subjects referenced in the enrollments
      const subjectIds = [...new Set(enrollments.filter(e => e.subject_id).map(e => e.subject_id))];
      
      let subjectsData = [];
      if (subjectIds.length > 0) {
        const { data: allSubjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, credit_value, type')
          .in('id', subjectIds);
          
        if (subjectsError) throw subjectsError;
        subjectsData = allSubjects || [];
      }

      // Step 5: Compile all data together
      const studentsWithData = students.map(student => {
        // Find the class group for this student
        const classGroup = classGroupsData.find(cg => cg.id === student.class_group_id);
        
        // Find all enrollments for this student
        const studentEnrollments = enrollments.filter(e => e.student_id === student.id);
        
        // Enhance each enrollment with subject data
        const enrichedEnrollments = studentEnrollments.map(enrollment => {
          const subject = subjectsData.find(s => s.id === enrollment.subject_id) || { 
            credit_value: 0, 
            name: 'Unknown Subject' 
          };
          
          return { 
            ...enrollment, 
            subject 
          };
        });
        
        // Calculate total credits from term1_credits and term2_credits
        const totalCredits = enrichedEnrollments.reduce(
          (sum, enrollment) => {
            const term1Credits = enrollment.term1_credits || 0;
            const term2Credits = enrollment.term2_credits || 0;
            return sum + term1Credits + term2Credits;
          }, 
          0
        );
        
        const maxPossibleCredits = enrichedEnrollments.reduce(
          (sum, enrollment) => sum + (enrollment.subject.credit_value || 0), 
          0
        );
        
        const percentage = maxPossibleCredits > 0 
          ? ((totalCredits / maxPossibleCredits) * 100).toFixed(1)
          : '0.0';
        
        // Calculate grade based on percentage
        const grade = calculateGrade(totalCredits, maxPossibleCredits);
        
        return {
          ...student,
          class_groups: classGroup,
          enrollments: enrichedEnrollments,
          totalCredits,
          maxPossibleCredits,
          percentage,
          grade
        };
      });

      setStudents(studentsWithData);
      setSelectedStudents([]); // Reset selection
    } catch (err) {
      console.error('Error loading students:', err);
      setError(err.message);
    }
  };

  const handleYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    await loadClassGroups(yearId);
    await loadStudents(yearId);
  };

  const handleClassGroupChange = async (e) => {
    const classGroupId = e.target.value;
    setSelectedClassGroup(classGroupId);
    await loadStudents(selectedYear);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStudents(selectedYear);
  };

  const handleStudentSelect = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(student => student.id));
    }
  };

  const handleGenerateCertificate = (student) => {
    try {
      // Generate certificate
      const certificateHTML = generateCertificate(student);
      
      // Print it
      printCertificate(certificateHTML);
    } catch (err) {
      console.error('Error generating certificate:', err);
      alert(`Error generating certificate: ${err.message}`);
    }
  };

  const handleGenerateSelected = () => {
    try {
      if (selectedStudents.length === 0) {
        alert('Please select at least one student');
        return;
      }
      
      const selectedStudentData = students.filter(student => 
        selectedStudents.includes(student.id)
      );
      
      batchGenerateCertificates(selectedStudentData);
    } catch (err) {
      console.error('Error generating certificates:', err);
      alert(`Error generating certificates: ${err.message}`);
    }
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
          }}>Loading Certificates...</h1>
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
              backgroundColor: '#4f46e5',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Reports
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
      {/* Header */}
      <header style={{
        backgroundColor: '#8b5cf6', // Purple for certificates
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
          }}>Generate Certificates</h1>
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
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <ArrowLeft size={16} />
            Back to Reports
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
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '1rem'
          }}>
            Filter Students
          </h2>

          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Academic Year Filter */}
            <div style={{ flex: '1 1 250px' }}>
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
            <div style={{ flex: '1 1 250px' }}>
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
            <div style={{ flex: '2 1 300px' }}>
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
              <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  style={{ 
                    width: '100%',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }}>
                  <Search size={16} />
                </div>
                <button 
                  type="submit" 
                  style={{ display: 'none' }}
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Batch Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              {selectedStudents.length} of {students.length} students selected
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '0.75rem'
          }}>
            <button
              onClick={handleSelectAll}
              style={{ 
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                color: '#4b5563',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Users size={16} />
              {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
            </button>
            
            <button
              onClick={handleGenerateSelected}
              disabled={selectedStudents.length === 0}
              style={{ 
                backgroundColor: selectedStudents.length === 0 ? '#e5e7eb' : '#8b5cf6',
                color: selectedStudents.length === 0 ? '#9ca3af' : 'white',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: selectedStudents.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Printer size={16} />
              Generate Selected
            </button>
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
            <Award size={48} style={{ margin: '0 auto', color: '#9ca3af', marginBottom: '1rem' }} />
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
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '1rem'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.length === students.length && students.length > 0}
                      onChange={handleSelectAll}
                      style={{
                        width: '1rem',
                        height: '1rem'
                      }}
                    />
                  </th>
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
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Credits
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    %
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Grade
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
                      padding: '0.75rem 1.5rem',
                      textAlign: 'center'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentSelect(student.id)}
                        style={{
                          width: '1rem',
                          height: '1rem'
                        }}
                      />
                    </td>
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
                      padding: '1rem 1.5rem',
                      fontSize: '0.875rem',
                      color: '#111827'
                    }}>
                      {student.class_groups?.name || 'Unassigned'}
                    </td>
                    <td style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.875rem',
                      color: '#111827',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        fontWeight: '600'
                      }}>
                        {student.totalCredits}
                      </span>
                      {' / '}
                      <span style={{
                        color: '#6b7280'
                      }}>
                        {student.maxPossibleCredits}
                      </span>
                    </td>
                    <td style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        backgroundColor: getPercentageColor(student.percentage),
                        color: 'white',
                        fontWeight: '500',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem'
                      }}>
                        {student.percentage}%
                      </span>
                    </td>
                    <td style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      color: getGradeColor(student.grade)
                    }}>
                      {student.grade}
                    </td>
                    <td style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'right'
                    }}>
                      <button
                        onClick={() => handleGenerateCertificate(student)}
                        style={{
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          fontWeight: '500',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Award size={12} />
                        Generate Certificate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper function to get color based on percentage
function getPercentageColor(percentage) {
  const percent = parseFloat(percentage);
  if (percent < 40) return '#ef4444'; // Red
  if (percent < 55) return '#f59e0b'; // Amber
  if (percent < 70) return '#10b981'; // Green
  if (percent < 85) return '#3b82f6'; // Blue
  return '#8b5cf6'; // Purple
}

// Helper function to get color based on grade
function getGradeColor(grade) {
  switch (grade) {
    case 'Distinction':
      return '#8b5cf6'; // Purple
    case 'Merit I':
      return '#3b82f6'; // Blue
    case 'Merit II':
      return '#10b981'; // Green
    case 'Pass':
      return '#f59e0b'; // Amber
    case 'Fail':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}

// Export the component with auth wrapper
export default withAuth(CertificatesPage);