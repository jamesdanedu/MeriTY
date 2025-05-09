import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';
import { getSession } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Portfolios() {
  const router = useRouter();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Student list state
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [classGroups, setClassGroups] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  // Initial data load
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Check authentication using the custom JWT approach
        const { session } = getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Store user data
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
          await loadClassGroups(currentYear.id);
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadClassGroups(yearsData[0].id);
        }

        // Load initial students
        await loadStudents();
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Load class groups for a specific year
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

  // Load students with filtering and portfolio status
  const loadStudents = async () => {
    try {
      setLoading(true);
      
      // Calculate pagination range
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Build base query
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
          )
        `, { count: 'exact' });

      // Apply year filter
      if (selectedYear) {
        query = query.eq('class_groups.academic_year_id', selectedYear);
      }

      // Apply class group filter
      if (selectedClassGroup !== 'all') {
        query = query.eq('class_group_id', selectedClassGroup);
      }

      // Apply search term if exists
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      // Add pagination and ordering
      query = query
        .range(from, to)
        .order('name', { ascending: true });

      const { data: studentsData, count, error } = await query;

      if (error) throw error;

      // Now fetch all portfolios for these students in one query
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map(student => student.id);
        
        const { data: portfoliosData, error: portfoliosError } = await supabase
          .from('portfolios')
          .select(`
            id,
            student_id,
            period,
            credits_earned,
            interview_comments,
            feedback
          `)
          .eq('academic_year_id', selectedYear)
          .in('student_id', studentIds);
          
        if (portfoliosError) throw portfoliosError;
        
        // Create a map of student ID to portfolio status
        const portfolioStatusMap = {};
        
        // Initialize status object for each student
        studentIds.forEach(id => {
          portfolioStatusMap[id] = {
            'Term 1': { exists: false, reviewed: false },
            'Term 2': { exists: false, reviewed: false }
          };
        });
        
        if (portfoliosData && portfoliosData.length > 0) {
          portfoliosData.forEach(portfolio => {
            // Determine if portfolio has been reviewed
            const isReviewed = portfolio.credits_earned > 0 || 
                         (portfolio.interview_comments && portfolio.interview_comments.trim() !== '') ||
                         (portfolio.feedback && portfolio.feedback.trim() !== '');
            
            // Update status map
            if (portfolio.period === 'Term 1') {
              portfolioStatusMap[portfolio.student_id]['Term 1'] = { 
                exists: true, 
                reviewed: isReviewed,
                id: portfolio.id
              };
            } else if (portfolio.period === 'Term 2') {
              portfolioStatusMap[portfolio.student_id]['Term 2'] = { 
                exists: true, 
                reviewed: isReviewed,
                id: portfolio.id
              };
            }
          });
        }
        
        // Add portfolio status to each student
        const studentsWithStatus = studentsData.map(student => ({
          ...student,
          portfolioStatus: portfolioStatusMap[student.id]
        }));
        
        setStudents(studentsWithStatus);
      } else {
        setStudents([]);
      }
      
      setTotalStudents(count || 0);
      
    } catch (err) {
      console.error('Error loading students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle year change
  const handleYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    setSelectedClassGroup('all');
    setPage(1);
    await loadClassGroups(yearId);
    await loadStudents();
  };

  // Handle class group change
  const handleClassGroupChange = async (e) => {
    setSelectedClassGroup(e.target.value);
    setPage(1);
    await loadStudents();
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
    loadStudents();
  };

  // Navigate to dashboard
  const goToDashboard = () => {
    router.push('/dashboard');
  };

  // Navigate to portfolio review or show error
  const handleReviewPortfolio = async (studentId, term) => {
    try {
      // Get the portfolio with academic year info
      const { data: portfolio, error } = await supabase
        .from('portfolios')
        .select(`
          id,
          student_id,
          period,
          academic_year_id,
          academic_years (
            id,
            name
          )
        `)
        .eq('student_id', studentId)
        .eq('period', term)
        .single();
  
      if (error) throw error;
  
      if (portfolio) {
        // If portfolio exists, go to review page  
        router.push(`/portfolios/${portfolio.id}/review`);
      } else {
        // If no portfolio exists, show error
        setError(`No portfolio review exists for ${term}`);
      }
    } catch (err) {
      console.error('Error checking portfolio:', err);
      setError(err.message);
    }
  };

  // Create a new portfolio
  const createPortfolio = async (studentId, term) => {
    try {
      // First get current academic year
      if (!selectedYear) {
        setError("No academic year selected");
        return;
      }
      
      // Create portfolio
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          student_id: studentId,
          period: term,
          academic_year_id: selectedYear,
          credits_earned: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Navigate to the new portfolio
      if (data) {
        router.push(`/portfolios/${data.id}/review`);
      }
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError(err.message);
    }
  };

  // Clear error message
  const clearError = () => {
    setError(null);
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%'
    }}>
      <header style={{
        backgroundColor: '#be185d', // Rose color for portfolios
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
          }}>MeriTY - Review Student Portfolios</h1>
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
        {/* Error notification */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>{error}</div>
            <button 
              onClick={clearError}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#b91c1c',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filters and Search */}
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
              htmlFor="studentSearch" 
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
            <div style={{
              position: 'relative'
            }}>
              <input
                id="studentSearch"
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={handleSearchChange}
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
              <Search 
                size={16} 
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

        {/* Status legend */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Status:</div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#dcfce7', 
            color: '#166534',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}>
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Reviewed
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Pending Review
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#f3f4f6', 
            color: '#6b7280',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            No Portfolio
          </div>
        </div>

        {/* Students List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            Loading students...
          </div>
        ) : students.length === 0 ? (
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
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ margin: '0 auto' }}
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
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
              {searchTerm 
                ? `No students match the search term "${searchTerm}".`
                : 'No students available for the selected year and class group.'}
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
                  }}>Email</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>Class Group</th>
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
                      <span style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {student.class_groups?.name || 'Not Assigned'}
                      </span>
                    </td>
                    <td style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'right',
                      whiteSpace: 'nowrap'
                    }}>
                      <button
                        onClick={() => {
                          if (student.portfolioStatus['Term 1'].exists) {
                            handleReviewPortfolio(student.id, 'Term 1');
                          } else {
                            createPortfolio(student.id, 'Term 1');
                          }
                        }}
                        style={{
                          backgroundColor: student.portfolioStatus['Term 1'].exists 
                            ? (student.portfolioStatus['Term 1'].reviewed ? '#dcfce7' : '#fee2e2') 
                            : '#f3f4f6',
                          color: student.portfolioStatus['Term 1'].exists
                            ? (student.portfolioStatus['Term 1'].reviewed ? '#166534' : '#b91c1c')
                            : '#6b7280',
                          fontWeight: '500',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          marginRight: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        Term 1
                        {student.portfolioStatus['Term 1'].exists && student.portfolioStatus['Term 1'].reviewed ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '0.25rem'}}>
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : student.portfolioStatus['Term 1'].exists ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '0.25rem'}}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '0.25rem'}}>
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (student.portfolioStatus['Term 2'].exists) {
                            handleReviewPortfolio(student.id, 'Term 2');
                          } else {
                            createPortfolio(student.id, 'Term 2');
                          }
                        }}
                        style={{
                          backgroundColor: student.portfolioStatus['Term 2'].exists 
                            ? (student.portfolioStatus['Term 2'].reviewed ? '#dcfce7' : '#fee2e2') 
                            : '#f3f4f6',
                          color: student.portfolioStatus['Term 2'].exists
                            ? (student.portfolioStatus['Term 2'].reviewed ? '#166534' : '#b91c1c')
                            : '#6b7280',
                          fontWeight: '500',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        Term 2
                        {student.portfolioStatus['Term 2'].exists && student.portfolioStatus['Term 2'].reviewed ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '0.25rem'}}>
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : student.portfolioStatus['Term 2'].exists ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '0.25rem'}}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '0.25rem'}}>
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalStudents > itemsPerPage && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  Showing {Math.min((page - 1) * itemsPerPage + 1, totalStudents)} to {Math.min(page * itemsPerPage, totalStudents)} of {totalStudents} students
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                  <button
                    onClick={() => {
                      const newPage = Math.max(page - 1, 1);
                      setPage(newPage);
                      loadStudents();
                    }}
                    disabled={page === 1}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      fontSize: '0.875rem',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.5 : 1
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      const newPage = page + 1;
                      if (newPage * itemsPerPage <= totalStudents) {
                        setPage(newPage);
                        loadStudents();
                      }
                    }}
                    disabled={page * itemsPerPage >= totalStudents}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      fontSize: '0.875rem',
                      cursor: page * itemsPerPage >= totalStudents ? 'not-allowed' : 'pointer',
                      opacity: page * itemsPerPage >= totalStudents ? 0.5 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}