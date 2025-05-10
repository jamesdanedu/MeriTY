import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { ArrowLeft, UserPlus, Search, CheckCircle, AlertCircle, UserX } from 'lucide-react';
import { withAuth } from '@/contexts/withAuth';
import { getSession } from '@/utils/auth';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function PortfoliosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    reviewed: true,
    pending: true,
    none: true
  });

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Fetch academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);
        
        // Set default selected year to current year or first in list
        const currentYear = yearsData?.find(year => year.is_current);
        if (currentYear) {
          setSelectedYear(currentYear.id);
          await loadClassGroups(currentYear.id);
          await loadPortfoliosData(currentYear.id, 'all');
        } else if (yearsData && yearsData.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadClassGroups(yearsData[0].id);
          await loadPortfoliosData(yearsData[0].id, 'all');
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Load class groups for selected academic year
  const loadClassGroups = async (yearId) => {
    if (!yearId) {
      console.warn('No year ID provided to loadClassGroups');
      setClassGroups([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('class_groups')
        .select('*')
        .eq('academic_year_id', yearId)
        .order('name');
        
      if (error) throw error;
      setClassGroups(data || []);
      
      // Reset selected class group when year changes
      setSelectedClassGroup('all');
    } catch (err) {
      console.error('Error loading class groups:', err);
      setError(err.message);
    }
  };

  // Load portfolios and students data
  const loadPortfoliosData = async (yearId, classGroupId) => {
    if (!yearId) {
      console.warn('No year ID provided to loadPortfoliosData');
      setStudents([]);
      setPortfolios([]);
      return;
    }
    
    try {
      // Step 1: Load students based on class group filter
      let studentsQuery = supabase
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
        `)
        .order('name');
      
      // Apply class group filter if not 'all'
      if (classGroupId !== 'all') {
        studentsQuery = studentsQuery.eq('class_group_id', parseInt(classGroupId));
      } else {
        // Only get students from the selected academic year
        studentsQuery = studentsQuery.eq('class_groups.academic_year_id', yearId);
      }
      
      // Apply search filter if provided
      if (searchTerm) {
        studentsQuery = studentsQuery.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      const { data: studentsData, error: studentsError } = await studentsQuery;
      
      if (studentsError) throw studentsError;
      
      // Step 2: Load portfolios for the selected academic year
      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('academic_year_id', yearId);
        
      if (portfoliosError) throw portfoliosError;
      
      // Step 3: Combine the data
      const studentIds = studentsData.map(student => student.id);
      
      // Filter portfolios to only include ones belonging to our fetched students
      const relevantPortfolios = portfoliosData.filter(portfolio => 
        studentIds.includes(portfolio.student_id)
      );
      
      setStudents(studentsData || []);
      setPortfolios(relevantPortfolios || []);
    } catch (err) {
      console.error('Error loading portfolios data:', err);
      setError(err.message);
    }
  };

  // Handle academic year change
  const handleYearChange = async (e) => {
    const yearId = parseInt(e.target.value);
    setSelectedYear(yearId);
    await loadClassGroups(yearId);
    await loadPortfoliosData(yearId, 'all');
  };

  // Handle class group change
  const handleClassGroupChange = async (e) => {
    const classGroupId = e.target.value;
    setSelectedClassGroup(classGroupId);
    await loadPortfoliosData(selectedYear, classGroupId);
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    await loadPortfoliosData(selectedYear, selectedClassGroup);
  };

  // Handle filter changes
  const handleFilterChange = (filterName) => {
    setFilters({
      ...filters,
      [filterName]: !filters[filterName]
    });
  };

  // Navigate to review page for a student
  const goToReviewPage = (studentId) => {
    router.push(`/portfolios/${studentId}?year=${selectedYear}`);
  };

  // Navigate back to dashboard
  const goToDashboard = () => {
    router.push('/dashboard');
  };

  // Filter students based on portfolio status
  const filteredStudents = students.filter(student => {
    const studentPortfolio = portfolios.find(p => p.student_id === student.id);
    
    if (studentPortfolio) {
      if (studentPortfolio.interview_comments && filters.reviewed) {
        return true;
      } else if (!studentPortfolio.interview_comments && filters.pending) {
        return true;
      }
    } else if (filters.none) {
      return true;
    }
    
    return false;
  });

  // Get portfolio status for a student
  const getPortfolioStatus = (studentId) => {
    const portfolio = portfolios.find(p => p.student_id === studentId);
    
    if (!portfolio) return 'none';
    if (portfolio.interview_comments) return 'reviewed';
    return 'pending';
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
          }}>Loading Portfolios...</h1>
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
      {/* Header */}
      <header style={{
        backgroundColor: '#be185d',
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
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Filters Section */}
      <div style={{
        maxWidth: '1400px',
        margin: '1.5rem auto',
        padding: '0 1.5rem'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Academic Year Filter */}
          <div style={{
            flex: '1 1 250px'
          }}>
            <label 
              htmlFor="academicYear"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#4b5563',
                marginBottom: '0.5rem'
              }}
            >
              Academic Year
            </label>
            <select
              id="academicYear"
              value={selectedYear || ''}
              onChange={handleYearChange}
              style={{
                width: '100%',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
                color: '#111827',
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
          <div style={{
            flex: '1 1 250px'
          }}>
            <label 
              htmlFor="classGroup"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#4b5563',
                marginBottom: '0.5rem'
              }}
            >
              Class Group
            </label>
            <select
              id="classGroup"
              value={selectedClassGroup}
              onChange={handleClassGroupChange}
              style={{
                width: '100%',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
                color: '#111827',
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

          {/* Search */}
          <div style={{
            flex: '2 1 300px'
          }}>
            <label 
              htmlFor="searchStudents"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#4b5563',
                marginBottom: '0.5rem'
              }}
            >
              Search Students
            </label>
            <form onSubmit={handleSearch} style={{ position: 'relative' }}>
              <input
                id="searchStudents"
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.625rem 2.5rem 0.625rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#111827',
                  backgroundColor: 'white'
                }}
              />
              <button
                type="submit"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#4b5563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Search size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Status Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#4b5563',
            display: 'flex',
            alignItems: 'center'
          }}>
            Status:
          </span>
          
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={filters.reviewed}
              onChange={() => handleFilterChange('reviewed')}
              style={{
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <CheckCircle size={16} color="#047857" />
              <span style={{ color: '#047857', fontSize: '0.875rem' }}>Reviewed</span>
            </div>
          </label>
          
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={filters.pending}
              onChange={() => handleFilterChange('pending')}
              style={{
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <AlertCircle size={16} color="#b45309" />
              <span style={{ color: '#b45309', fontSize: '0.875rem' }}>Pending Review</span>
            </div>
          </label>
          
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={filters.none}
              onChange={() => handleFilterChange('none')}
              style={{
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <UserX size={16} color="#6b7280" />
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>No Portfolio</span>
            </div>
          </label>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '0.375rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#b91c1c'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Students Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          overflow: 'hidden'
        }}>
          {filteredStudents.length === 0 ? (
            <div style={{
              padding: '4rem 2rem',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <UserX size={48} color="#9ca3af" />
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
                maxWidth: '500px',
                margin: '0 auto'
              }}>
                No students available for the selected year and class group.
              </p>
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb'
                }}>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Student
                  </th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Class Group
                  </th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '0.75rem 1.5rem',
                    textAlign: 'right',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => {
                  const status = getPortfolioStatus(student.id);
                  
                  return (
                    <tr 
                      key={student.id}
                      style={{
                        borderBottom: index < filteredStudents.length - 1 ? '1px solid #e5e7eb' : 'none',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                    >
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {student.email}
                        </div>
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: '#4b5563'
                      }}>
                        {student.class_groups?.name || 'Unassigned'}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        textAlign: 'center'
                      }}>
                        {status === 'reviewed' ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            <CheckCircle size={14} />
                            <span>Reviewed</span>
                          </div>
                        ) : status === 'pending' ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            <AlertCircle size={14} />
                            <span>Pending</span>
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            <UserX size={14} />
                            <span>No Portfolio</span>
                          </div>
                        )}
                      </td>
                      <td style={{
                        padding: '1rem 1.5rem',
                        textAlign: 'right'
                      }}>
                        <button
                          onClick={() => goToReviewPage(student.id)}
                          style={{
                            backgroundColor: status === 'reviewed' ? '#047857' : status === 'pending' ? '#b45309' : '#be185d',
                            color: 'white',
                            fontWeight: '500',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {status === 'reviewed' ? (
                            <>
                              <CheckCircle size={14} />
                              <span>View Review</span>
                            </>
                          ) : status === 'pending' ? (
                            <>
                              <AlertCircle size={14} />
                              <span>Complete Review</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} />
                              <span>Create Portfolio</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(PortfoliosPage);