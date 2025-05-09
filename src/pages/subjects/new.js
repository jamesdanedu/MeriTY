import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewSubject() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    creditValue: '',
    type: 'core',
    academicYearId: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Check authentication using getSession utility
        const { session } = getSession();
        
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
        
        // Load academic years for the dropdown
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);
        
        // Set default to current academic year if available
        const currentYear = yearsData?.find(year => year.is_current);
        if (currentYear) {
          setFormData(prev => ({
            ...prev,
            academicYearId: currentYear.id
          }));
        } else if (yearsData && yearsData.length > 0) {
          setFormData(prev => ({
            ...prev,
            academicYearId: yearsData[0].id
          }));
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
    if (!formData.name || !formData.creditValue || !formData.academicYearId) {
      setError('All fields are required');
      setSaving(false);
      return;
    }

    try {
      // Check if a subject with this name already exists for the selected academic year
      const { data: existingSubject, error: checkError } = await supabase
        .from('subjects')
        .select('*')
        .eq('name', formData.name)
        .eq('academic_year_id', formData.academicYearId)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingSubject) {
        setError('A subject with this name already exists for the selected academic year');
        setSaving(false);
        return;
      }

      // Create new subject
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: formData.name,
          credit_value: parseInt(formData.creditValue),
          type: formData.type,
          academic_year_id: parseInt(formData.academicYearId)
        })
        .select()
        .single();

      if (error) throw error;

      // Redirect back to subjects list
      window.location.href = '/subjects';
    } catch (err) {
      console.error('Error creating subject:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  const goBack = () => {
    window.location.href = '/subjects';
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
              backgroundColor: '#4f46e5',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Subjects
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
        backgroundColor: '#7c3aed', // Purple for subjects
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
          }}>Add Subject</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#7c3aed',
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Subjects
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
            Create a new subject for an academic year.
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
                htmlFor="academicYearId" 
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
                id="academicYearId"
                name="academicYearId"
                required
                value={formData.academicYearId}
                onChange={handleChange}
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
            </div>
            
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
                Subject Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Mathematics, Physics"
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
                htmlFor="creditValue" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Credit Value *
              </label>
              <input
                id="creditValue"
                name="creditValue"
                type="number"
                required
                min="1"
                value={formData.creditValue}
                onChange={handleChange}
                placeholder="Enter credit value"
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
                htmlFor="type" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Subject Type *
              </label>
              <select
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                style={{ 
                  width: '100%',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="core">Core Subject</option>
                <option value="optional">Optional Subject</option>
                <option value="short">Short Course</option>
                <option value="other">Other</option>
              </select>
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
                disabled={saving}
                style={{ 
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Create Subject'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
