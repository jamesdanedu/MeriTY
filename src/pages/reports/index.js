import React, { useMemo, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import {
  GraduationCap,
  Users,
  BookOpen,
  Award,
  BarChart,
  ArrowLeft
} from 'lucide-react';
import { getSession } from '@/utils/auth';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ReportsIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Predefined report types with their configurations
  const reportTypes = useMemo(() => [
    {
      id: 'students',
      title: 'Student Reports',
      description: 'Detailed analytics and insights for individual students',
      icon: GraduationCap,
      route: '/reports/students',
      color: '#3b82f6' // Blue
    },
    {
      id: 'classes',
      title: 'Class Reports',
      description: 'Comprehensive overview of class performance and credits',
      icon: Users,
      route: '/reports/classes',
      color: '#10b981' // Green
    },
    {
      id: 'subjects',
      title: 'Subject Reports',
      description: 'In-depth analysis of subject enrollments and credits',
      icon: BookOpen,
      route: '/reports/subjects',
      color: '#8b5cf6' // Purple
    },
    {
      id: 'certificates',
      title: 'Certificates',
      description: 'Generate and manage student achievement certificates',
      icon: Award,
      route: '/reports/certificates',
      color: '#f43f5e' // Rose
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      description: 'Comprehensive credit and performance visualizations',
      icon: BarChart,
      route: '/reports/analytics',
      color: '#eab308' // Amber
    }
  ], []);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Get user session
        const { session } = getSession();
        
        if (!session) {
          console.log("No active session, redirecting to login");
          router.push('/login');
          return;
        }

        // Check if user is an admin (optional, if reports should be admin-only)
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (teacherError) {
          throw teacherError;
        }
        
        if (!teacherData || !teacherData.is_active) {
          setError('Your account has been deactivated');
          router.push('/dashboard');
          return;
        }

        // Store user data
        setUser(session.user);
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  const navigateToReport = (route) => {
    router.push(route);
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
          }}>Loading Reports...</h1>
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
        backgroundColor: '#3b82f6',
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
            onClick={goToDashboard}
            style={{ 
              backgroundColor: 'white',
              color: '#4f46e5',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #4f46e5',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={16} style={{ marginRight: '0.25rem' }} />
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
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Reports & Analytics
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Access detailed reports and insights for students, classes, and subjects
          </p>
        </div>

        {/* Report Types Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {reportTypes.map((report) => {
            const IconComponent = report.icon;
            
            return (
              <div
                key={report.id}
                onClick={() => navigateToReport(report.route)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  ':hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    backgroundColor: `${report.color}15`, // Light version of the color
                    color: report.color,
                    borderRadius: '9999px',
                    padding: '0.75rem',
                    marginRight: '1rem'
                  }}>
                    <IconComponent size={24} />
                  </div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: '#111827'
                  }}>
                    {report.title}
                  </h3>
                </div>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  {report.description}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <span style={{
                    color: report.color,
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    View Report →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}