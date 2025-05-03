import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EditStudent() {
  const router = useRouter();
  const { id } = router.query;
  
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    classGroupId: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Check authentication
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          throw authError;
        }
        
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
          
        if (teacherError) {
          throw teacherError;
        }
        
        if (!teacherData) {
          // Redirect non-teachers back to login
          window.location.href = '/login';
          return;
        }
        
        // Load academic years for the dropdown
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);
        
        // Only load student data if we have an ID
        if (id) {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select(`
              *,
              class_groups (
                id,
                name,
                academic_year_id
              )
            `)
            .eq('id', id)
            .single();

          if (studentError) throw studentError;
          
          if (!studentData) {
            setError('Student not found');
            return;
          }
          
          setStudent(studentData);
          
          // Set form data
          setFormData({
            name: studentData.name,
            email: studentData.email || '',
            classGroupId: studentData.class_group_id || ''
          });
          
          // If student has a class group, load related academic year
          if (studentData.class_groups) {
            setSelectedYear(studentData.class_groups.academic_year_id);
            
            // Load class groups for this academic year
            const { data: groupsData, error: groupsError } = await supabase
              .from('class_groups')
              .select('*')
              .eq('academic_year_id', studentData.class_groups.academic_year_id)
              .order('name', { ascending: true });
              
            if (groupsError) throw groupsError;
            setClassGroups(groupsData || []);
          } else {
            // Set default to current academic year if available
            const currentYear = yearsData?.find(year => year.is_current);
            if (currentYear) {
              setSelectedYear(currentYear.id);
              
              // Load class groups for current year
              const { data: groupsData, error: groupsError } = await supabase
                .from('class_groups')
                .select('*')
                .eq('academic_year_id', currentYear.id)
                .order('name', { ascending: true });
                
              if (groupsError) throw groupsError;
              setClassGroups(groupsData || []);
            } else if (yearsData && yearsData.length > 0) {
              setSelectedYear(yearsData[0].id);
              
              // Load class groups for first year
              const { data: groupsData, error: groupsError } = await supabase
                .from('class_groups')
                .select('*')
                .eq('academic_year_id', yearsData[0].id)
                .order('name', { ascending: true });
                
              if (groupsError) throw groupsError;
              setClassGroups(groupsData || []);
            }
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  // When the academic year changes, update class groups
  const handleYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    setFormData(prev => ({
      ...prev,
      classGroupId: '' // Reset the class group selection
    }));
    
    if (!yearId) {
      setClassGroups([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Load class groups for selected year
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
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Basic validation
    if (!formData.name) {
      setError('Student name is required');
      setSaving(false);
      return;
    }
    
    // Validate class group is selected
    if (!formData.classGroupId) {
      setError('Class group is required');
      setSaving(false);
      return;
    }

    try {
      // Check if a student with this email already exists (if email provided and changed)
      if (formData.email && formData.email !== student.email) {
        const { data: existingStudent, error: checkError } = await supabase
          .from('students')
          .select('*')
          .eq('email', formData.email)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (existingStudent) {
          setError('A student with this email already exists');
          setSaving(false);
          return;
        }
      }

      // Update student
      const { data, error } = await supabase
        .from('students')
        .update({
          name: formData.name,
          email: formData.email || null, // Make email optional
          class_group_id: formData.classGroupId // Class Group is required
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Redirect back to students list
      window.location.href = '/students';
    } catch (err) {
      console.error('Error updating student:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  const goBack = () => {
    window.location.href = '/students';
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

  if (error && !saving) {
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
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Students
          </button>
        </div>
      </div>
    );
  }
  
  if (!student && !loading) {
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
          }}>Not Found</h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>The student you're looking for cannot be found.</p>
          <button 
            onClick={goBack}
            style={{ 
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Students
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
        backgroundColor: '#3b82f6', // Blue color for students
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
          }}>Edit Student</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#3b82f6',
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Students
          </button>
        </div>
      </header>
      
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Update student information and class group assignment.
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '1.5rem'
        }}>
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              padding: '1rem',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontWeight: '500' }}>Error</p>
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="name" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Student Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="email" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Email (Optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem'
              }}>
                Student email address if available.
              </p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="academicYear" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Academic Year *
              </label>
              <select
                id="academicYear"
                value={selectedYear}
                onChange={handleYearChange}
                required
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Academic Year</option>
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem'
              }}>
                Select an academic year to see available class groups.
              </p>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label 
                htmlFor="classGroupId" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Class Group *
              </label>
              <select
                id="classGroupId"
                name="classGroupId"
                value={formData.classGroupId}
                onChange={handleChange}
                required
                disabled={!selectedYear || classGroups.length === 0}
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  backgroundColor: (!selectedYear || classGroups.length === 0) ? '#f3f4f6' : 'white'
                }}
              >
                <option value="">Select Class Group</option>
                {classGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {!selectedYear && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem'
                }}>
                  Select an academic year first.
                </p>
              )}
              {selectedYear && classGroups.length === 0 && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#b91c1c',
                  marginTop: '0.25rem'
                }}>
                  No class groups available for the selected academic year. Please create a class group first.
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={goBack}
                disabled={saving}
                style={{ 
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.classGroupId || classGroups.length === 0}
                style={{ 
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: (saving || !formData.classGroupId || classGroups.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !formData.classGroupId || classGroups.length === 0) ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Update Student'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}