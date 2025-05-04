// src/pages/reports/index.js

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, FileText, Download, Users, School, Award } from 'lucide-react';

// Import certificate manager - use named imports instead of export *
import CertificateManager from '../reports/certificates';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize certificate manager
const certificateManager = new CertificateManager({
  principalName: 'Sarah Johnson',
  coordinatorName: 'Michael O\'Brien',
  schoolInfo: {
    name: 'St. Mary\'s Secondary School',
    address: '123 Education Street, Dublin',
    logo: '/assets/school-logo.png'
  }
});

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
        
        // Check if user is a teacher/admin
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

        setIsAdmin(teacherData.is_admin);

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

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  // Handle report card click based on type
  const handleReportCardClick = async (type) => {
    if (type === 'certificates') {
      navigateToCertificates();
    } else if (type === 'class-performance') {
      navigateToClassPerformance();
    } else if (type === 'student-progress') {
      navigateToStudentProgress();
    } else {
      // For reports still under development
      alert('This report feature is coming soon!');
    }
  };

  // Navigation functions for different report types
  const navigateToCertificates = () => {
    window.location.href = '/reports/certificates';
  };

  const navigateToClassPerformance = () => {
    window.location.href = '/reports/class-performance';
  };

  const navigateToStudentProgress = () => {
    window.location.href = '/reports/student-progress';
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
        backgroundColor: '#ef4444', // Red color for reports
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
          }}>MeriTY Reports</h1>
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
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <label 
            htmlFor="yearFilter" 
            style={{ 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem',
              display: 'block'
            }}
          >
            Academic Year
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

        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
          Student Reports
        </h2>

        {/* Top Row of Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem' // Added increased margin to create separation
        }}>
          {/* Student Credits Report */}
          <ReportCard
            title="Student Credits Summary"
            description="Generate detailed reports showing credit totals and progress by student. Filter by class group and export to PDF or Excel."
            icon={<BarChart size={28} style={{color: '#ef4444'}} />}
            comingSoon={true}
            onClick={() => handleReportCardClick('student-credits')}
          />
          
          {/* Class Group Credits Report */}
          <ReportCard
            title="Class Group Analytics"
            description="View statistics and comparative analytics across all class groups. See distribution of credits and identify achievement patterns."
            icon={<School size={28} style={{color: '#ef4444'}} />}
            comingSoon={false}
            onClick={() => handleReportCardClick('class-performance')}
          />
          
          {/* Student List Export */}
          <ReportCard
            title="Student List Export"
            description="Export complete student lists including all credit details. Customize columns and filter data before exporting to Excel."
            icon={<Download size={28} style={{color: '#ef4444'}} />}
            comingSoon={true}
            onClick={() => handleReportCardClick('student-list')}
          />
        </div>

        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem'
        }}>
          Administrative Reports
        </h2>

        {/* Bottom Row of Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {/* Credit Breakdown Report */}
          <ReportCard
            title="Credit Breakdown Report"
            description="Generate detailed breakdowns of credit sources for each student. See proportions from subjects, work experience, and other activities."
            icon={<FileText size={28} style={{color: '#ef4444'}} />}
            comingSoon={true}
            onClick={() => handleReportCardClick('credit-breakdown')}
          />
          
          {/* Progress Tracker */}
          <ReportCard
            title="Student Progress Tracker"
            description="Track student credit accumulation over time with visual charts. Compare progress against targets and identify trends."
            icon={<Users size={28} style={{color: '#ef4444'}} />}
            comingSoon={false}
            onClick={() => handleReportCardClick('student-progress')}
          />
          
          {/* Certificates */}
          <ReportCard
            title="Certificates"
            description="Generate and print achievement certificates for students who have reached credit milestones or completed specific requirements."
            icon={<Award size={28} style={{color: '#ef4444'}} />}
            comingSoon={false}
            onClick={() => handleReportCardClick('certificates')}
          />
        </div>

        {/* Only show this message if most features are coming soon */}
        <div style={{
          backgroundColor: '#fef2f2',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginTop: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#b91c1c',
            marginBottom: '0.5rem'
          }}>
            Some Report Features Coming Soon
          </h3>
          <p style={{
            color: '#9b1c1c',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Additional report types are being developed. Currently, you can access the Certificates, 
            Class Group Analytics, and Student Progress Tracker. More features will be available soon!
          </p>
        </div>
      </main>
    </div>
  );
}

// Report Card Component
function ReportCard({ title, description, icon, comingSoon = false, onClick }) {
  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '2rem', // Increased padding to make cards bigger
        cursor: comingSoon ? 'default' : 'pointer',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        opacity: comingSoon ? 0.7 : 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={comingSoon ? undefined : onClick}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start'
      }}>
        <div style={{
          color: '#ef4444',
          backgroundColor: '#fef2f2',
          padding: '0.75rem', // Increased padding for icon
          borderRadius: '0.5rem'
        }}>
          {icon}
        </div>
        {comingSoon && (
          <span style={{
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            padding: '0.25rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            Coming Soon
          </span>
        )}
      </div>
      <h3 style={{
        fontSize: '1.25rem', // Increased font size
        fontWeight: '600',
        color: '#111827',
        marginTop: '1.5rem' // Increased margin
      }}>{title}</h3>
      <p style={{
        color: '#6b7280',
        fontSize: '0.95rem', // Increased font size
        marginTop: '0.75rem',
        lineHeight: '1.5' // Improved line height for readability
      }}>{description}</p>
    </div>
  );
}

// Export only the certificate manager as a named export, not the whole module
// This avoids the Next.js export * error
export { certificateManager };

