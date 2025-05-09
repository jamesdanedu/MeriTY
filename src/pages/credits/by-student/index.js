import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, X, Award, Briefcase, ClockIcon, FileText } from 'lucide-react';
import { useRouter } from 'next/router';
import { getSession } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CreditsByStudent() {
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState('subjects');
  
  // New state for TY credits
  const [attendance, setAttendance] = useState({
    term1: { id: null, credits: 0 },
    term2: { id: null, credits: 0 }
  });
  const [workExperience, setWorkExperience] = useState({
    id: null,
    business: '',
    startDate: '',
    endDate: '',
    credits: 0,
    comments: ''
  });
  const [portfolio, setPortfolio] = useState({
    term1: { id: null, credits: 0, comments: '' },
    term2: { id: null, credits: 0, comments: '' },
    fullYear: { id: null, credits: 0, comments: '' }
  });

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Check authentication using the auth utility
        const { session } = await getSession();
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
  }, [router]);

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

      // Load all enrollments for the student (for Subjects tab)
      const { data: enrollmentData, error: enrollmentsError } = await supabase
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

      if (enrollmentsError) throw enrollmentsError;
      setEnrollments(enrollmentData || []);

      // Load attendance data (for TY tab)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.id);
        
      if (attendanceError) throw attendanceError;
      
      // Process attendance data
      const term1Data = attendanceData?.find(a => a.period === 'Term 1') || { id: null, credits_earned: 0 };
      const term2Data = attendanceData?.find(a => a.period === 'Term 2') || { id: null, credits_earned: 0 };
      
      setAttendance({
        term1: { id: term1Data.id, credits: term1Data.credits_earned || 0 },
        term2: { id: term2Data.id, credits: term2Data.credits_earned || 0 }
      });

      // Load work experience data
      const { data: workExpData, error: workExpError } = await supabase
        .from('work_experience')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();
        
      if (workExpError) throw workExpError;
      
      if (workExpData) {
        setWorkExperience({
          id: workExpData.id,
          business: workExpData.business || '',
          startDate: workExpData.start_date ? workExpData.start_date.split('T')[0] : '',
          endDate: workExpData.end_date ? workExpData.end_date.split('T')[0] : '',
          credits: workExpData.credits_earned || 0,
          comments: workExpData.comments || ''
        });
      }

      // Load portfolio data
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('student_id', student.id);
        
      if (portfolioError) throw portfolioError;
      
      // Process portfolio data
      const term1Portfolio = portfolioData?.find(p => p.period === 'Term 1') || { id: null, credits_earned: 0, interview_comments: '' };
      const term2Portfolio = portfolioData?.find(p => p.period === 'Term 2') || { id: null, credits_earned: 0, interview_comments: '' };
      const fullYearPortfolio = portfolioData?.find(p => p.period === 'Full Year') || { id: null, credits_earned: 0, interview_comments: '' };
      
      setPortfolio({
        term1: { 
          id: term1Portfolio.id, 
          credits: term1Portfolio.credits_earned || 0, 
          comments: term1Portfolio.interview_comments || '' 
        },
        term2: { 
          id: term2Portfolio.id, 
          credits: term2Portfolio.credits_earned || 0, 
          comments: term2Portfolio.interview_comments || '' 
        },
        fullYear: { 
          id: fullYearPortfolio.id, 
          credits: fullYearPortfolio.credits_earned || 0, 
          comments: fullYearPortfolio.interview_comments || '' 
        }
      });
      
    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Subject tab handlers
  const handleSaveSubjectCredits = async () => {
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

  // TY tab handlers
  const saveAttendance = async (period, credits) => {
    if (!selectedStudent) return;
    
    try {
      setSaving(true);
      
      const recordId = period === 'Term 1' ? attendance.term1.id : attendance.term2.id;
      
      if (recordId) {
        // Update existing record
        const { error } = await supabase
          .from('attendance')
          .update({
            credits_earned: credits,
            updated_at: new Date().toISOString()
          })
          .eq('id', recordId);
          
        if (error) throw error;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('attendance')
          .insert({
            student_id: selectedStudent.id,
            period: period,
            credits_earned: credits,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        // Update local state with new ID
        if (period === 'Term 1') {
          setAttendance(prev => ({
            ...prev,
            term1: { ...prev.term1, id: data.id }
          }));
        } else {
          setAttendance(prev => ({
            ...prev,
            term2: { ...prev.term2, id: data.id }
          }));
        }
      }
      
      alert(`Attendance credits for ${period} updated successfully`);
    } catch (err) {
      console.error('Error saving attendance credits:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const saveWorkExperience = async () => {
    if (!selectedStudent) return;
    
    try {
      setSaving(true);
      
      const { id, business, startDate, endDate, credits, comments } = workExperience;
      
      if (id) {
        // Update existing record
        const { error } = await supabase
          .from('work_experience')
          .update({
            business,
            start_date: startDate,
            end_date: endDate,
            credits_earned: credits,
            comments,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
          
        if (error) throw error;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('work_experience')
          .insert({
            student_id: selectedStudent.id,
            business,
            start_date: startDate,
            end_date: endDate,
            credits_earned: credits,
            comments,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        // Update local state with new ID
        setWorkExperience(prev => ({
          ...prev,
          id: data.id
        }));
      }
      
      alert('Work experience credits updated successfully');
    } catch (err) {
      console.error('Error saving work experience:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const savePortfolio = async (period) => {
    if (!selectedStudent) return;
    
    try {
      setSaving(true);
      
      let portfolioData;
      if (period === 'Term 1') {
        portfolioData = portfolio.term1;
      } else if (period === 'Term 2') {
        portfolioData = portfolio.term2;
      } else {
        portfolioData = portfolio.fullYear;
      }
      
      if (portfolioData.id) {
        // Update existing record
        const { error } = await supabase
          .from('portfolios')
          .update({
            credits_earned: portfolioData.credits,
            interview_comments: portfolioData.comments,
            updated_at: new Date().toISOString()
          })
          .eq('id', portfolioData.id);
          
        if (error) throw error;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('portfolios')
          .insert({
            student_id: selectedStudent.id,
            period: period,
            credits_earned: portfolioData.credits,
            interview_comments: portfolioData.comments,
            academic_year_id: selectedYear,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        // Update local state with new ID
        if (period === 'Term 1') {
          setPortfolio(prev => ({
            ...prev,
            term1: { ...prev.term1, id: data.id }
          }));
        } else if (period === 'Term 2') {
          setPortfolio(prev => ({
            ...prev,
            term2: { ...prev.term2, id: data.id }
          }));
        } else {
          setPortfolio(prev => ({
            ...prev,
            fullYear: { ...prev.fullYear, id: data.id }
          }));
        }
      }
      
      alert(`Portfolio credits for ${period} updated successfully`);
    } catch (err) {
      console.error('Error saving portfolio credits:', err);
      setError(err.message);
    } finally {
      setSaving(false);
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
        backgroundColor: '#eab308',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        padding: '0.75rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '100%', // Changed from 1000px to use more screen space
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
        maxWidth: '100%', // Changed from 1000px to use more screen space
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
              const yearId = parseInt(e.target.value, 10);
              setSelectedYear(yearId);
              setSelectedStudent(null);
              setSearchResults([]);
              loadSubjects(yearId);
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
                    transition: 'background-color 0.2s',
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

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '1.5rem'
            }}>
              <div
                onClick={() => setActiveTab('subjects')}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'subjects' ? '600' : '400',
                  color: activeTab === 'subjects' ? '#111827' : '#6b7280',
                  borderBottom: activeTab === 'subjects' ? '2px solid #eab308' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Subjects
              </div>
              <div
                onClick={() => setActiveTab('ty')}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'ty' ? '600' : '400',
                  color: activeTab === 'ty' ? '#111827' : '#6b7280',
                  borderBottom: activeTab === 'ty' ? '2px solid #eab308' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                TY
              </div>
            </div>

            {/* Tab Content - Subjects */}
            {activeTab === 'subjects' && (
              <>
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
                    onClick={handleSaveSubjectCredits}
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
              </>
            )}

            {/* Tab Content - TY */}
            {activeTab === 'ty' && (
              <div>
                {/* Attendance Section */}
                <div style={{
                  marginBottom: '2rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <ClockIcon size={18} style={{ color: '#6b7280' }} />
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      Attendance
                    </h3>
                  </div>
                  
                  <div style={{ padding: '1rem' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {/* Term 1 */}
                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '1rem',
                        borderRadius: '0.375rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem'
                        }}>
                          <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#374151',
                            margin: 0
                          }}>
                            Term 1
                          </h4>
                          <button
                            onClick={() => saveAttendance('Term 1', attendance.term1.credits)}
                            disabled={saving}
                            style={{
                              backgroundColor: '#eab308',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              border: 'none',
                              fontSize: '0.75rem',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.7 : 1
                            }}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Credits (out of 10)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={attendance.term1.credits}
                            onChange={(e) => setAttendance(prev => ({
                              ...prev,
                              term1: { ...prev.term1, credits: parseInt(e.target.value) || 0 }
                            }))}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Term 2 */}
                      <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '1rem',
                        borderRadius: '0.375rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem'
                        }}>
                          <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#374151',
                            margin: 0
                          }}>
                            Term 2
                          </h4>
                          <button
                            onClick={() => saveAttendance('Term 2', attendance.term2.credits)}
                            disabled={saving}
                            style={{
                              backgroundColor: '#eab308',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              border: 'none',
                              fontSize: '0.75rem',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.7 : 1
                            }}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Credits (out of 10)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={attendance.term2.credits}
                            onChange={(e) => setAttendance(prev => ({
                              ...prev,
                              term2: { ...prev.term2, credits: parseInt(e.target.value) || 0 }
                            }))}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Work Experience Section */}
                <div style={{
                  marginBottom: '2rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Briefcase size={18} style={{ color: '#6b7280' }} />
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      Work Experience
                    </h3>
                  </div>
                  
                  <div style={{ padding: '1rem' }}>
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
                          marginBottom: '0.25rem'
                        }}>
                          Business/Organization
                        </label>
                        <input
                          type="text"
                          value={workExperience.business}
                          onChange={(e) => setWorkExperience(prev => ({
                            ...prev,
                            business: e.target.value
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.25rem'
                        }}>
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={workExperience.startDate}
                          onChange={(e) => setWorkExperience(prev => ({
                            ...prev,
                            startDate: e.target.value
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.25rem'
                        }}>
                          End Date
                        </label>
                        <input
                          type="date"
                          value={workExperience.endDate}
                          onChange={(e) => setWorkExperience(prev => ({
                            ...prev,
                            endDate: e.target.value
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.25rem'
                        }}>
                          Credits
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={workExperience.credits}
                          onChange={(e) => setWorkExperience(prev => ({
                            ...prev,
                            credits: parseInt(e.target.value) || 0
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.25rem'
                      }}>
                        Comments
                      </label>
                      <textarea
                        value={workExperience.comments}
                        onChange={(e) => setWorkExperience(prev => ({
                          ...prev,
                          comments: e.target.value
                        }))}
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db'
                        }}
                      ></textarea>
                    </div>
                    
                    <button
                      onClick={saveWorkExperience}
                      disabled={saving}
                      style={{
                        backgroundColor: '#eab308',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Work Experience'}
                    </button>
                  </div>
                </div>
                
                {/* Portfolio Section */}
                <div style={{
                  marginBottom: '2rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <FileText size={18} style={{ color: '#6b7280' }} />
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      Portfolio
                    </h3>
                  </div>
                  
                  <div style={{ padding: '1rem' }}>
                    {/* Term 1 Portfolio */}
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <h4 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                          margin: 0
                        }}>
                          Term 1 Portfolio
                        </h4>
                        <button
                          onClick={() => savePortfolio('Term 1')}
                          disabled={saving}
                          style={{
                            backgroundColor: '#eab308',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            fontSize: '0.75rem',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                          }}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Credits (out of 30)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={portfolio.term1.credits}
                            onChange={(e) => setPortfolio(prev => ({
                              ...prev,
                              term1: { ...prev.term1, credits: parseInt(e.target.value) || 0 }
                            }))}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Comments
                          </label>
                          <textarea
                            value={portfolio.term1.comments}
                            onChange={(e) => setPortfolio(prev => ({
                              ...prev,
                              term1: { ...prev.term1, comments: e.target.value }
                            }))}
                            rows="2"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          ></textarea>
                        </div>
                      </div>
                    </div>
                    
                    {/* Term 2 Portfolio */}
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <h4 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                          margin: 0
                        }}>
                          Term 2 Portfolio
                        </h4>
                        <button
                          onClick={() => savePortfolio('Term 2')}
                          disabled={saving}
                          style={{
                            backgroundColor: '#eab308',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            fontSize: '0.75rem',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                          }}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Credits (out of 30)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={portfolio.term2.credits}
                            onChange={(e) => setPortfolio(prev => ({
                              ...prev,
                              term2: { ...prev.term2, credits: parseInt(e.target.value) || 0 }
                            }))}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Comments
                          </label>
                          <textarea
                            value={portfolio.term2.comments}
                            onChange={(e) => setPortfolio(prev => ({
                              ...prev,
                              term2: { ...prev.term2, comments: e.target.value }
                            }))}
                            rows="2"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          ></textarea>
                        </div>
                      </div>
                    </div>
                    
                    {/* Full Year Portfolio */}
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '1rem',
                      borderRadius: '0.375rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <h4 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#374151',
                          margin: 0
                        }}>
                          Full Year Portfolio
                        </h4>
                        <button
                          onClick={() => savePortfolio('Full Year')}
                          disabled={saving}
                          style={{
                            backgroundColor: '#eab308',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            fontSize: '0.75rem',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                          }}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Credits (out of 60)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={portfolio.fullYear.credits}
                            onChange={(e) => setPortfolio(prev => ({
                              ...prev,
                              fullYear: { ...prev.fullYear, credits: parseInt(e.target.value) || 0 }
                            }))}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Comments
                          </label>
                          <textarea
                            value={portfolio.fullYear.comments}
                            onChange={(e) => setPortfolio(prev => ({
                              ...prev,
                              fullYear: { ...prev.fullYear, comments: e.target.value }
                            }))}
                            rows="2"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db'
                            }}
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}