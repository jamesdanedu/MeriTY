import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FileText, 
  Users, 
  Award, 
  ArrowRight, 
  Download,
  TrendingUp,
  FileCertificate 
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

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
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
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

  const navigateTo = (path) => {
    window.location.href = path;
  };

  const goBack = () => {
    window.location.href = '/dashboard';
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
        backgroundColor: '#dc2626', // Red color for reports
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
          }}>Reports</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#dc2626',
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Dashboard
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        {/* Academic Year Selection */}
        <div style={{
          marginBottom: '2rem'
        }}>
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
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ 
              width: '100%',
              maxWidth: '300px',
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

        {/* Report Categories */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Student Progress Reports */}
          <div 
            onClick={() => navigateTo('/reports/student-progress')}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div style={{
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                padding: '0.5rem',
                borderRadius: '0.5rem'
              }}>
                <FileText size={24} />
              </div>
              <ArrowRight size={20} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginTop: '1rem'
            }}>Student Progress Reports</h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>Detailed individual student progress reports with term-by-term breakdowns</p>
          </div>

          {/* Class Performance Analysis */}
          <div 
            onClick={() => navigateTo('/reports/class-performance')}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div style={{
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                padding: '0.5rem',
                borderRadius: '0.5rem'
              }}>
                <TrendingUp size={24} />
              </div>
              <ArrowRight size={20} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginTop: '1rem'
            }}>Class Performance Analysis</h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>Compare performance across terms and generate class statistics</p>
          </div>

          {/* Certificates */}
          <div 
            onClick={() => navigateTo('/reports/certificates')}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div style={{
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                padding: '0.5rem',
                borderRadius: '0.5rem'
              }}>
                <FileCertificate size={24} />
              </div>
              <ArrowRight size={20} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginTop: '1rem'
            }}>Certificates</h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>Generate and manage Transition Year completion certificates</p>
          </div>

          {/* Bulk Export */}
          <div 
            onClick={() => navigateTo('/reports/export')}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div style={{
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                padding: '0.5rem',
                borderRadius: '0.5rem'
              }}>
                <Download size={24} />
              </div>
              <ArrowRight size={20} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginTop: '1rem'
            }}>Bulk Export</h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>Export all reports and certificates for the selected academic year</p>
          </div>
        </div>
      </main>
    </div>
  );
}
