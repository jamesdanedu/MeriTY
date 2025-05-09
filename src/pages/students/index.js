// src/pages/students/index.js
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { GraduationCap, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSession } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Number of students per page
const PAGE_SIZE = 20;

export default function Students() {
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        // Check authentication first
        const { session } = await getSession();
        
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
        // Get class groups for selected year
        const { data, error } = await supabase
          .from('class_groups')
          .select('*')
          .eq('academic_year_id', selectedYear)
          .order('name', { ascending: true });

        if (error) throw error;
        setClassGroups(data || []);
      } catch (err) {
        console.error('Error loading class groups:', err);
        setError(err.message);
      }
    }
    
    loadClassGroups();
    
    // Reset pagination when year changes
    setCurrentPage(1);
  }, [selectedYear]);
  
  useEffect(() => {
    // Reset pagination when class group changes
    setCurrentPage(1);
  }, [selectedClassGroup]);
  
  useEffect(() => {
    // Load students when selectedYear, selectedClassGroup, or currentPage changes
    async function loadStudents() {
      if (!selectedYear) return;
      
      try {
        setLoading(true);
        
        // First get all class groups for the selected academic year
        const { data: yearClassGroups, error: groupsError } = await supabase
          .from('class_groups')
          .select('id')
          .eq('academic_year_id', selectedYear);
          
        if (groupsError) throw groupsError;
        
        // Extract the class group IDs
        const classGroupIds = yearClassGroups?.map(group => group.id) || [];
        
        // Base query without pagination to get the total count
        let countQuery = supabase
          .from('students')
          .select('id', { count: 'exact' });
        
        // Apply filters based on selection
        if (selectedClassGroup !== 'all') {
          // Filter by specific class group
          countQuery = countQuery.eq('class_group_id', selectedClassGroup);
        } else if (classGroupIds.length > 0) {
          // Filter by all class groups in the selected academic year
          countQuery = countQuery.in('class_group_id', classGroupIds);
        } else {
          // If no class groups in this year, we won't have any students
          setStudents([]);
          setTotalStudents(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }
        
        // Execute count query
        const { count, error: countError } = await countQuery;
        
        if (countError) throw countError;
        
        // Set total counts and calculate total pages
        setTotalStudents(count || 0);
        setTotalPages(Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)));
        
        // Ensure current page is valid
        const validPage = Math.min(currentPage, Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)));
        if (validPage !== currentPage) {
          setCurrentPage(validPage);
        }
        
        // Now query students with pagination
        let dataQuery = supabase
          .from('students')
          .select(`
            id, 
            name, 
            email,
            class_group_id,
            class_groups (
              id,
              name,
              academic_year_id
            )
          `);
        
        // Apply the same filters
        if (selectedClassGroup !== 'all') {
          dataQuery = dataQuery.eq('class_group_id', selectedClassGroup);
        } else if (classGroupIds.length > 0) {
          dataQuery = dataQuery.in('class_group_id', classGroupIds);
        }
        
        // Apply pagination
        const offset = (validPage - 1) * PAGE_SIZE;
        dataQuery = dataQuery
          .order('name', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        
        // Execute the data query
        const { data, error } = await dataQuery;

        if (error) throw error;
        
        console.log(`Loaded students (page ${validPage}/${Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))}):`);
        setStudents(data || []);
      } catch (err) {
        console.error('Error loading students:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadStudents();
  }, [selectedYear, selectedClassGroup, currentPage]);

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };
  
  const handleAddStudent = () => {
    window.location.href = '/students/new';
  };

  const handleImportStudents = () => {
    window.location.href = '/students/import';
  };

  const handleEditStudent = (id) => {
    window.location.href = `/students/${id}/edit`;
  };

  const handleDeleteStudent = (id) => {
    window.location.href = `/students/${id}/delete`;
  };
  
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setSelectedClassGroup('all');
  };
  
  const handleClassGroupChange = (e) => {
    setSelectedClassGroup(e.target.value);
  };
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper to generate pagination UI
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    let pageButtons = [];
    
    // Show first page, last page, and a sliding window around current page
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust the start if we're near the end
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page
    if (startPage > 1) {
      pageButtons.push(
        <button 
          key="first" 
          onClick={() => goToPage(1)}
          style={{
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.375rem',
            backgroundColor: '1' === currentPage ? '#e0e7ff' : 'white',
            color: '1' === currentPage ? '#4f46e5' : '#374151',
            border: '1px solid #d1d5db',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          1
        </button>
      );
      
      // Ellipsis if needed
      if (startPage > 2) {
        pageButtons.push(
          <span key="ellipsis1" style={{ padding: '0 0.25rem', color: '#6b7280' }}>
            ...
          </span>
        );
      }
    }
    
    // Page buttons in the sliding window
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {  // Skip first and last which are handled separately
        pageButtons.push(
          <button 
            key={i} 
            onClick={() => goToPage(i)}
            style={{
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
              backgroundColor: i === currentPage ? '#e0e7ff' : 'white',
              color: i === currentPage ? '#4f46e5' : '#374151',
              border: '1px solid #d1d5db',
              fontWeight: '500',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            {i}
          </button>
        );
      }
    }
    
    // Last page
    if (endPage < totalPages) {
      // Ellipsis if needed
      if (endPage < totalPages - 1) {
        pageButtons.push(
          <span key="ellipsis2" style={{ padding: '0 0.25rem', color: '#6b7280' }}>
            ...
          </span>
        );
      }
      
      pageButtons.push(
        <button 
          key="last" 
          onClick={() => goToPage(totalPages)}
          style={{
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.375rem',
            backgroundColor: totalPages === currentPage ? '#e0e7ff' : 'white',
            color: totalPages === currentPage ? '#4f46e5' : '#374151',
            border: '1px solid #d1d5db',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          {totalPages}
        </button>
      );
    }
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '1.5rem'
      }}>
        {/* Previous button */}
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            color: currentPage === 1 ? '#d1d5db' : '#374151',
            border: '1px solid #d1d5db',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronLeft size={18} />
        </button>
        
        {/* Page buttons */}
        {pageButtons}
        
        {/* Next button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            color: currentPage === totalPages ? '#d1d5db' : '#374151',
            border: '1px solid #d1d5db',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  if (loading && currentPage === 1) { // Only show loading screen on first page load
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
          }}>Loading students...</h1>
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
          }}>Students</h1>
          <div style={{
            display: 'flex',
            gap: '0.75rem'
          }}>
            <button
              onClick={handleImportStudents}
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
              onClick={handleAddStudent}
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
              <span style={{ marginRight: '0.25rem' }}>+</span> Add Student
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
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              Manage student records and class group assignments.
            </p>
            {totalStudents > 0 && (
              <p style={{
                color: '#4b5563',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Showing {students.length} of {totalStudents} students
                {selectedClassGroup !== 'all' ? ' in selected class group' : ''}
                {` (Page ${currentPage} of ${totalPages})`}
              </p>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
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
            
            {/* Class Group Filter */}
            {classGroups.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <label 
                  htmlFor="classGroupFilter" 
                  style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151'
                  }}
                >
                  Class Group:
                </label>
                <select
                  id="classGroupFilter"
                  value={selectedClassGroup}
                  onChange={handleClassGroupChange}
                  style={{ 
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
        </div>
        
        {students.length === 0 ? (
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
              <GraduationCap size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              No students found
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              {selectedYear 
                ? `No students found for the selected filters.`
                : `Please select an academic year to manage students.`}
            </p>
            {selectedYear && (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={handleAddStudent}
                  style={{ 
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    display:'inline-flex',
                    alignItems: 'center',
                    fontSize: '0.875rem'
                  }}
                >
                  <span style={{ marginRight: '0.25rem' }}>+</span> Add Student
                </button>
                <button
                  onClick={handleImportStudents}
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
            )}
          </div>
        ) : (
          <>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Loading overlay */}
              {loading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 5
                }}>
                  <div style={{
                    textAlign: 'center',
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                  }}>
                    <p style={{
                      color: '#4b5563',
                      fontWeight: '500'
                    }}>Loading...</p>
                  </div>
                </div>
              )}
              
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
                        Class Group
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
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {student.email || '-'}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {student.class_groups?.name || 'Not Assigned'}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          textAlign: 'right'
                        }}>
                          <button
                            onClick={() => handleEditStudent(student.id)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#3b82f6',
                              fontWeight: '500',
                              cursor: 'pointer',
                              marginRight: '1rem'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
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
            
            {/* Pagination controls */}
            {renderPagination()}
          </>
        )}
      </main>
    </div>
  );
}