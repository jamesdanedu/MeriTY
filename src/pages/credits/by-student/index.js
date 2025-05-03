import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, X, Award } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CreditsByStudent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [credits, setCredits] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [saving, setSaving] = useState(false);

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
          await loadSubjects(currentYear.id);
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadSubjects(yearsData[0].id);
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

  const loadSubjects = async (yearId) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('academic_year_id', yearId)
        .order('name');
        
      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError(err.message);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm || !selectedYear) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
        .eq('class_groups.academic_year_id', selectedYear)
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchTerm('');

    try {
      setLoading(true);

      // Load all enrollments for the student
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          subject_id,
          credits_earned,
          term,
          subjects (
            name,
            type
          )
        `)
        .eq('student_id', student.id);

      if (error) throw error;
      setEnrollments(data || []);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredits = async () => {
    if (!selectedStudent || !selectedSubject || !selectedTerm) return;

    try {
      setSaving(true);

      // Check if enrollment exists
      const { data: existing, error: checkError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', selectedStudent.id)
        .eq('subject_id', selectedSubject)
        .eq('term', selectedTerm)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Update existing enrollment
        const { error } = await supabase
          .from('enrollments')
          .update({
            credits_earned: credits,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new enrollment
        const { error } = await supabase
          .from('enrollments')
          .insert({
            student_id: selectedStudent.id,
            subject_id: selectedSubject,
            credits_earned: credits,
            term: selectedTerm,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Refresh enrollments
      const { data: updated, error: refreshError } = await supabase
        .from('enrollments')
        .select(`
          id,
          subject_id,
          credits_earned,
          term,
          subjects (
            name,
            type
          )
        `)
        .eq('student_id', selectedStudent.id);

      if (refreshError) throw refreshError;
      setEnrollments(updated || []);

      // Reset form
      setCredits(0);
      setSelectedSubject('');
      setSelectedTerm('');

      alert('Credits updated successfully');
    } catch (err) {
      console.error('Error saving credits:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    window.location.href = '/credits';
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
        backgroundColor: '#eab308',
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
          }}>Credits by Student</h1>
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
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Credits
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        {/* Year Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
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
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedStudent(null);
              setSearchResults([]);
              loadSubjects(e.target.value);
            }}
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

        {/* Student Search */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for a student by name..."
              style={{
                width: '100%',
                padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem'
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: '#6b7280'
              }}
            >
              <Search size={20} />
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{
              marginTop: '0.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {searchResults.map(student => (
                <div
                  key={student.id}
                  onClick={() => selectStudent(student)}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    ':hover': {
                      backgroundColor: '#f9fafb'
                    }
                  }}
                >
                  <div style={{
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    {student.name}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {student.class_groups?.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '1.5rem'
          }}>
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.375rem'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                {selectedStudent.name}
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                Class Group: {selectedStudent.class_groups?.name}
              </p>
            </div>

            {/* Credit Assignment Form */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db'
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

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Term
                  </label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <option value="">Select Term</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Full Year">Full Year</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Credits
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={credits}
                    onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveCredits}
                disabled={!selectedSubject || !selectedTerm || saving}
                style={{
                  backgroundColor: '#eab308',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (!selectedSubject || !selectedTerm || saving) ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Credits'}
              </button>
            </div>

            {/* Enrollments Table */}
            <div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '1rem'
              }}>
                Current Enrollments
              </h3>
              <div style={{
                overflowX: 'auto'
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
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Subject</th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Type</th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Term</th>
                      <th style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map(enrollment => (
                      <tr key={enrollment.id} style={{
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          {enrollment.subjects?.name}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {enrollment.subjects?.type}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {enrollment.term}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          fontSize: '0.875rem',
                          color: '#374151',
                          textAlign: 'right'
                        }}>
                          {enrollment.credits_earned || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}