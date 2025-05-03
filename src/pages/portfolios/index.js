import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Portfolios() {
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

  // Load students with filtering
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

      const { data, count, error } = await query;

      if (error) throw error;

      setStudents(data || []);
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
    window.location.href = '/dashboard';
  };

  // Navigate to portfolio review
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
        window.location.href = `/portfolios/${portfolio.id}/review`;
      } else {
        // If no portfolio exists, show error
        setError(`No portfolio review exists for ${term}`);
      }
    } catch (err) {
      console.error('Error checking portfolio:', err);
      setError(err.message);
    }
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
          }}>Portfolio Reviews</h1>
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
    onClick={() => handleReviewPortfolio(student.id, 'Term 1')}
    style={{
      backgroundColor: 'transparent', 
      border: 'none',
      color: '#be185d',
      fontWeight: '500',
      cursor: 'pointer',
      marginRight: '1rem'
    }}
  >
    Term 1
  </button>
  <button
    onClick={() => handleReviewPortfolio(student.id, 'Term 2')}
    style={{
      backgroundColor: 'transparent',
      border: 'none',
      color: '#be185d',
      fontWeight: '500',
      cursor: 'pointer'
    }}
  >
    Term 2
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
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
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
                    onClick={() => setPage(prev => (prev * itemsPerPage < totalStudents ? prev + 1 : prev))}
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
  );<td style={{
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    textAlign: 'right'
  }}>
    <button
      onClick={() => handleReviewPortfolio(student.id)}
      style={{
        backgroundColor: 'transparent',
        border: 'none',
        color: '#be185d',
        fontWeight: '500',
        cursor: 'pointer'
      }}
    >
      Review
    </button>
  </td>
}