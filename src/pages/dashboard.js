import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import {
  Calendar,
  Users,
  BookOpen,
  Award,
  BarChart,
  GraduationCap,
  LogOut,
  UserCog,
  BriefcaseBusiness 
} from 'lucide-react';
import { getSession, signOut } from '@/utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    currentYear: null,
    classGroups: 0,
    students: 0,
    subjects: 0,
    teachers: 0
  });

  useEffect(() => {
    async function loadUserData() {
      try {
        console.log('Starting loadUserData');
        
        // Check if user is authenticated
        const { session } = getSession();
        
        if (!session || !session.user) {
          console.log('No valid session found, redirecting to login');
          router.push('/login?reason=no_session');
          return;
        }
        
        // Set user state BEFORE accessing any properties
        setUser(session.user);
        
        // Safely access email with optional chaining
        const userEmail = session.user?.email;
        
        if (!userEmail) {
          console.error('User email is missing from session');
          setError('Invalid user data. Please login again.');
          // Clear invalid session
          signOut();
          return;
        }

        console.log('User email from session:', userEmail);
        
        // Verify user in database to ensure they still exist and are active
        try {
          const { data: teacherData, error: teacherError } = await supabase
            .from('teachers')
            .select('*')
            .eq('email', userEmail)
            .single();
          
          console.log('Teacher Data:', teacherData);
          
          if (teacherError) {
            console.error('Error fetching teacher data:', teacherError);
            setError('Unable to verify your account. Please login again.');
            signOut();
            return;
          }
          
          if (!teacherData) {
            console.error('No teacher data found');
            setError('Your account no longer exists. Please contact an administrator.');
            signOut();
            return;
          }

          // Ensure user is active
          if (!teacherData.is_active) {
            console.error('Teacher account is not active');
            setError('Your account has been deactivated. Please contact an administrator.');
            signOut();
            return;
          }
          
          // Load stats data only if user validation is successful
          await loadStats();
        } catch (dbError) {
          console.error('Database error:', dbError);
          setError('Error connecting to the database. Please try again later.');
        }
      } catch (err) {
        console.error('Error in loadUserData:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    loadUserData();
  }, [router]);

  const loadStats = async () => {
    console.log('User data:', user);
    console.log('User email:', user.email);
    
    if (!user || !user.email) {
      console.log('Cannot load stats - user or email is missing');
      return;
    }
    
    try {
      // Get current academic year
      const { data: currentYearData } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_current', true)
        .single();
        
      if (!currentYearData) {
        // If no current year is set, just use zeros for stats
        setStats({
          currentYear: null,
          classGroups: 0,
          students: 0,
          subjects: 0,
          teachers: 0
        });
        return;
      }
  
      // Store the current academic year ID for filtering
      const currentYearId = currentYearData.id;
      
      // Get class groups count for current year
      const { count: classGroupsCount } = await supabase
        .from('class_groups')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year_id', currentYearId);
  
      // First get the class group IDs
      const { data: classGroupsData } = await supabase
        .from('class_groups')
        .select('id')
        .eq('academic_year_id', currentYearId);
      
      // Get students count for current year based on class groups
      let studentsInCurrentYear = 0;
      if (classGroupsData && classGroupsData.length > 0) {
        const classGroupIds = classGroupsData.map(group => group.id);
        const { count: studentsCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('class_group_id', classGroupIds);
        
        studentsInCurrentYear = studentsCount || 0;
      }
  
      // Get subjects count for current year
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year_id', currentYearId);
        
      // Get teachers count (all active teachers, not year-specific)
      const { count: teachersCount } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
  
      setStats({
        currentYear: currentYearData,
        classGroups: classGroupsCount || 0,
        students: studentsInCurrentYear,
        subjects: subjectsCount || 0,
        teachers: teachersCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      // Don't set an error, just keep zeros for stats
      setStats({
        currentYear: null,
        classGroups: 0,
        students: 0,
        subjects: 0,
        teachers: 0
      });
    }
  };
  
  const handleSignOut = () => {
    signOut();
  };

  const navigateTo = (path) => {
    router.push(path);
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
          }}>Please wait while we load your dashboard</p>
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
            onClick={() => router.push('/login')}
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
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
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
          }}>Authentication Error</h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>You need to be logged in to view this page.</p>
          <button 
            onClick={() => router.push('/login')}
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
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Determine which cards to show based on user role
  const isAdmin = user?.isAdmin === true;

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%'
    }}>
      <header style={{
        backgroundColor: '#3b82f6', // Mid-blue color for the header
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
          }}>MeriTY Credits Manager</h1>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              marginRight: '1rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                backgroundColor: 'white',
                color: '#3b82f6',
                width: '2rem',
                height: '2rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                marginRight: '0.5rem'
              }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{
                color: 'white',
                fontWeight: '500'
              }}>
                {user?.name || user?.email || 'User'}
              </span>
              {isAdmin && (
                <span style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '9999px',
                  padding: '0.125rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  marginLeft: '0.5rem'
                }}>
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              style={{ 
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>
      
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1.5rem'
      }}> 
        {/* Stats Cards */}
        <center>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem'
          }}>
            <StatCard 
              title="Current Academic Year" 
              value={stats.currentYear?.name || "Not Set"} 
              icon={<Calendar className="text-indigo-500" size={20} />}
            />
            <StatCard 
              title="Class Groups" 
              value={stats.classGroups} 
              icon={<Users className="text-emerald-500" size={20} />}
            />
            <StatCard 
              title="Students" 
              value={stats.students} 
              icon={<GraduationCap className="text-blue-500" size={20} />}
            />
            <StatCard 
              title="Subjects" 
              value={stats.subjects} 
              icon={<BookOpen className="text-purple-500" size={20} />}
            />
            <StatCard 
              title="Teachers" 
              value={stats.teachers} 
              icon={<UserCog className="text-teal-500" size={20} />}
            />
          </div>
        </center>

        {/* Top Row Section Header */}
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1.5rem'
        }}>
          Administrative Functions
        </h3>
        
        {/* Top row - Admin only cards */}
        {isAdmin && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.3rem',
            marginBottom: '3.1rem'
          }}>
            <DashCard 
              title="Academic Years" 
              icon={<Calendar size={24} />}
              onClick={() => navigateTo('/academic-years')} 
            />

            <DashCard 
              title="Subjects" 
              icon={<BookOpen size={24} />}
              onClick={() => navigateTo('/subjects')} 
            />
            
            <DashCard 
              title="Class Groups" 
              icon={<Users size={24} />}
              onClick={() => navigateTo('/class-groups')} 
            />  
            
            <DashCard 
              title="Teachers" 
              icon={<UserCog size={24} />}
              onClick={() => navigateTo('/teachers')} 
            />
            
            <DashCard 
              title="Students" 
              icon={<GraduationCap size={24} />}
              onClick={() => navigateTo('/students')} 
            />
            
            <DashCard 
              title="Reports" 
              icon={<BarChart size={24} />}
              onClick={() => navigateTo('/reports')} 
            />
          </div>
        )}
        
        {/* Bottom Row Section Header */}
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1.3rem'
        }}>
          Teacher Functions
        </h3>
        
        {/* Bottom row - Cards for all users */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          
          <DashCard 
            title="Assign Credits" 
            icon={<Award size={24} />}
            onClick={() => navigateTo('/credits')} 
          />
          
          <DashCard 
            title="Review Portfolios" 
            icon={<BriefcaseBusiness size={24} />}
            onClick={() => navigateTo('/portfolios')} 
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '500',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {title}
        </span>
        <div style={{ color: '#4f46e5' }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#111827'
      }}>
        {value}
      </div>
    </div>
  );
}

function DashCard({ title, icon, onClick, disabled = false }) {
  return (
    <div 
      style={{ 
        backgroundColor: '#e3d5cf',
        borderRadius: '0.6rem',
        boxShadow: '0 2px 3px 0 rgba(0, 0, 0, 0.1), 0 2px 2px 0 rgba(0, 0, 0, 0.06)',
        padding: '1.2rem',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'all 0.2s ease-in-out',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}
      onClick={disabled ? undefined : onClick}
    >
      <div style={{
        marginBottom: '1rem',
        color: disabled ? '#9ca3af' : '#4f46e5',
        transform: 'scale(1.2)' 
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.15rem',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '0.2rem'
      }}>
        {title}
      </h3>
      <div style={{
        marginTop: 'auto'
      }}>
        <button 
          disabled={disabled}
          style={{ 
            color: '#4f46f5',
            fontWeight: '600',
            backgroundColor: 'transparent',
            border: 'none',
            padding: 0,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.7 : 1,
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
        </button>
      </div>
    </div>
  );
}
