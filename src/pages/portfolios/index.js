// src/pages/portfolios/index.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, User, Search, Filter, Download, BriefcaseBusiness, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { withAuth } from '@/contexts/withAuth';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function PortfoliosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [portfolioStats, setPortfolioStats] = useState({
    term1Completed: 0,
    term1Pending: 0,
    term2Completed: 0,
    term2Pending: 0
  });
  const [error, setError] = useState(null);

  // Place the navigation functions here, right after the state variables
  const handleViewReview = (portfolioId) => {
    router.push(`/portfolios/view/${portfolioId}`);
  };

  const handleEditReview = (studentId, term) => {
    router.push(`/portfolios/review/${studentId}?term=${term}&academicYear=${selectedYear}&mode=edit`);
  };

  const handleStartReview = (studentId, term) => {
    router.push(`/portfolios/review/${studentId}?term=${term}&academicYear=${selectedYear}&mode=create`);
  };

  const handleStudentClick = (studentId) => {
    router.push(`/students/${studentId}/portfolios`);
  };

  const goBack = () => {
    router.push('/dashboard');
  };


  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        
        // Get academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);
        
        // Set default year to current
        const currentYear = yearsData?.find(year => year.is_current);
        const yearToUse = currentYear ? currentYear.id : (yearsData.length > 0 ? yearsData[0].id : null);
        
        setSelectedYear(yearToUse);
        
        if (yearToUse) {
          // Load class groups for this year
          await loadClassGroups(yearToUse);
          // Load students and portfolio data
          await loadStudentData(yearToUse, 'all');
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
        .order('name');
        
      if (error) throw error;
      setClassGroups(data || []);
    } catch (err) {
      console.error('Error loading class groups:', err);
      setError(err.message);
    }
  };
  
  const loadStudentData = async (yearId, classGroupId) => {
    try {
      // First build the query for students in this year
      let query = supabase
        .from('students')
        .select(`
          id,
          name,
          email,
          class_groups!inner (
            id,
            name,
            academic_year_id
          )
        `)
        .eq('class_groups.academic_year_id', yearId);
      
      // Filter by class group if not 'all'
      if (classGroupId !== 'all') {
        query = query.eq('class_groups.id', classGroupId);
      }
      
      // Apply search term if exists
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      // Fetch students
      const { data: studentsData, error: studentsError } = await query.order('name');
      
      if (studentsError) throw studentsError;
      
      // For each student, get their portfolio status
      const studentsWithPortfolios = [];
      let term1Completed = 0;
      let term1Pending = 0;
      let term2Completed = 0;
      let term2Pending = 0;
      
      for (const student of (studentsData || [])) {
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('*')
          .eq('student_id', student.id)
          .eq('academic_year_id', yearId);
        
        // Find Term 1 and Term 2 portfolios
        const term1Portfolio = portfolios?.find(p => p.period === 'Term 1');
        const term2Portfolio = portfolios?.find(p => p.period === 'Term 2');
        
        // Check if the portfolio is truly complete (has interview comments and credits > 0)
        const term1IsComplete = term1Portfolio && 
          term1Portfolio.interview_comments && 
          term1Portfolio.credits_earned > 0;
          
        const term2IsComplete = term2Portfolio && 
          term2Portfolio.interview_comments && 
          term2Portfolio.credits_earned > 0;
        
        const term1Credits = term1Portfolio ? term1Portfolio.credits_earned : 0;
        const term2Credits = term2Portfolio ? term2Portfolio.credits_earned : 0;
        const totalCredits = term1Credits + term2Credits;
        
        // Update counters
        if (term1IsComplete) {
          term1Completed++;
        } else {
          term1Pending++;
        }
        
        if (term2IsComplete) {
          term2Completed++;
        } else {
          term2Pending++;
        }
        
        studentsWithPortfolios.push({
          ...student,
          term1Status: term1IsComplete ? 'completed' : 'pending',
          term1Portfolio,
          term1Credits,
          term2Status: term2IsComplete ? 'completed' : 'pending',
          term2Portfolio,
          term2Credits,
          totalCredits
        });
      }
      
      setStudents(studentsWithPortfolios);
      setPortfolioStats({
        term1Completed,
        term1Pending,
        term2Completed,
        term2Pending
      });
    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err.message);
    }
  };

  const handleYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    setSelectedClassGroup('all');
    await loadClassGroups(yearId);
    await loadStudentData(yearId, 'all');
  };

  const handleClassGroupChange = async (e) => {
    const classGroupId = e.target.value;
    setSelectedClassGroup(classGroupId);
    await loadStudentData(selectedYear, classGroupId);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    await loadStudentData(selectedYear, selectedClassGroup);
  };

  // Render loading state
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
          }}>Loading Portfolios...</h1>
          <p style={{
            color: '#6b7280'
          }}>Please wait</p>
        </div>
      </div>
    );
  }

  // Render error state
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
          <div style={{
            color: '#b91c1c',
            marginBottom: '1rem'
          }}>
            <AlertTriangle size={48} />
          </div>
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
      {/* Header */}
      <header style={{
        backgroundColor: '#6d28d9', // Purple for portfolios
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
            Back to Dashboard
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              margin: 0
            }}>
              <Filter size={18} style={{ verticalAlign: 'middle', display: 'inline', marginRight: '0.5rem' }} />
              Filters
            </h2>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            {/* Academic Year Filter */}
            <div style={{ flex: '1 1 200px' }}>
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
            <div style={{ flex: '1 1 200px' }}>
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

        {/* Portfolio Status Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Term 1 Completed */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '1rem',
            borderTop: '3px solid #3b82f6', // Blue for Term 1
            borderLeft: '1px solid #dbeafe',
            borderRight: '1px solid #dbeafe',
            borderBottom: '1px solid #dbeafe'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Term 1 Completed
              </span>
              <div style={{ 
                backgroundColor: '#dbeafe',
                color: '#3b82f6',
                padding: '0.25rem',
                borderRadius: '50%'
              }}>
                <CheckCircle size={16} />
              </div>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {portfolioStats.term1Completed}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {Math.round((portfolioStats.term1Completed / (portfolioStats.term1Completed + portfolioStats.term1Pending)) * 100) || 0}% of students
            </div>
          </div>

          {/* Term 1 Pending */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '1rem',
            borderTop: '3px solid #3b82f6', // Blue for Term 1
            borderLeft: '1px solid #dbeafe',
            borderRight: '1px solid #dbeafe',
            borderBottom: '1px solid #dbeafe'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Term 1 Pending
              </span>
              <div style={{ 
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                padding: '0.25rem',
                borderRadius: '50%'
              }}>
                <Clock size={16} />
              </div>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {portfolioStats.term1Pending}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {Math.round((portfolioStats.term1Pending / (portfolioStats.term1Completed + portfolioStats.term1Pending)) * 100) || 0}% of students
            </div>
          </div>

          {/* Term 2 Completed */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '1rem',
            borderTop: '3px solid #8b5cf6', // Purple for Term 2
            borderLeft: '1px solid #ede9fe',
            borderRight: '1px solid #ede9fe',
            borderBottom: '1px solid #ede9fe'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Term 2 Completed
              </span>
              <div style={{ 
                backgroundColor: '#dbeafe',
                color: '#3b82f6',
                padding: '0.25rem',
                borderRadius: '50%'
              }}>
                <CheckCircle size={16} />
              </div>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {portfolioStats.term2Completed}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {Math.round((portfolioStats.term2Completed / (portfolioStats.term2Completed + portfolioStats.term2Pending)) * 100) || 0}% of students
            </div>
          </div>

          {/* Term 2 Pending */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '1rem',
            borderTop: '3px solid #8b5cf6', // Purple for Term 2
            borderLeft: '1px solid #ede9fe',
            borderRight: '1px solid #ede9fe',
            borderBottom: '1px solid #ede9fe'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Term 2 Pending
              </span>
              <div style={{ 
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                padding: '0.25rem',
                borderRadius: '50%'
              }}>
                <Clock size={16} />
              </div>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {portfolioStats.term2Pending}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {Math.round((portfolioStats.term2Pending / (portfolioStats.term2Completed + portfolioStats.term2Pending)) * 100) || 0}% of students
            </div>
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
            <BriefcaseBusiness size={48} style={{ margin: '0 auto', color: '#9ca3af', marginBottom: '1rem' }} />
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
                    textAlign: 'left',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '25%'
                  }}>
                    Student
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '15%'
                  }}>
                    Class Group
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '15%',
                    backgroundColor: '#dbeafe',
                    borderBottom: '2px solid #3b82f6'
                  }}>
                    Term 1 Status
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '15%',
                    backgroundColor: '#dbeafe',
                    borderBottom: '2px solid #3b82f6'
                  }}>
                    Term 1 Action
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '15%',
                    backgroundColor: '#ede9fe',
                    borderBottom: '2px solid #8b5cf6'
                  }}>
                    Term 2 Status
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '15%',
                    backgroundColor: '#ede9fe',
                    borderBottom: '2px solid #8b5cf6'
                  }}>
                    Term 2 Action
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    width: '10%'
                  }}>
                    Total Credits
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} style={{
                    borderBottom: index < students.length - 1 ? '1px solid #e5e7eb' : 'none',
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                  }}>
                    <td
                      onClick={() => handleStudentClick(student.id)}
                      style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500'
                      }}
                    >
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
                    <td
                      onClick={() => handleStudentClick(student.id)}
                      style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#111827'
                      }}
                    >
                      {student.class_groups?.name}
                    </td>
                    <td
                      onClick={() => handleStudentClick(student.id)}
                      style={{
                        padding: '1rem 1.5rem',
                        textAlign: 'center'
                      }}
                    >
                      {student.term1Status === 'completed' ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#16a34a',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          <CheckCircle size={14} />
                          <span>{student.term1Credits} credits</span>
                        </div>
                      ) : (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#d97706',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          <Clock size={14} />
                          <span>Pending</span>
                        </div>
                      )}
                    </td>
                    <td style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'center'
                    }}>
                      {student.term1Portfolio ? (
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'center'
                        }}>
                          <button
                            onClick={() => handleViewReview(student.term1Portfolio.id)}
                            style={{
                              backgroundColor: '#dbeafe',
                              color: '#3b82f6',
                              fontWeight: '500',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            View
                          </button>
                          
                          <button
                            onClick={() => handleEditReview(student.id, 'Term 1')}
                            style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              fontWeight: '500',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartReview(student.id, 'Term 1')}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            fontWeight: '500',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Start Review
                        </button>
                      )}
                    </td>
                    <td
                      onClick={() => handleStudentClick(student.id)}
                      style={{
                        padding: '1rem 1.5rem',
                        textAlign: 'center'
                      }}
                    >
                      {student.term2Status === 'completed' ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#16a34a',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          <CheckCircle size={14} />
                          <span>{student.term2Credits} credits</span>
                        </div>
                      ) : (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#d97706',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          <Clock size={14} />
                          <span>Pending</span>
                        </div>
                      )}
                    </td>
                    <td style={{
                      padding: '1rem 1.5rem',
                      textAlign: 'center'
                    }}>
                      {student.term2Portfolio ? (
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'center'
                        }}>
                          <button
                            onClick={() => handleViewReview(student.term2Portfolio.id)}
                            style={{
                              backgroundColor: '#ede9fe',
                              color: '#8b5cf6',
                              fontWeight: '500',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            View
                          </button>
                          
                          <button
                            onClick={() => handleEditReview(student.id, 'Term 2')}
                            style={{
                              backgroundColor: '#8b5cf6',
                              color: 'white',
                              fontWeight: '500',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartReview(student.id, 'Term 2')}
                          style={{
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            fontWeight: '500',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Start Review
                        </button>
                      )}
                    </td>
                    <td
                      onClick={() => handleStudentClick(student.id)}
                      style={{
                        padding: '1rem 1.5rem',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#111827'
                      }}
                    >
                      {student.totalCredits}
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

export default withAuth(PortfoliosPage);