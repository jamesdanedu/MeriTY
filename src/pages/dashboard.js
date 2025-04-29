import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Calendar,
  Users,
  BookOpen,
  Award,
  BarChart,
  School,
  LogOut,
  UserCog
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    currentYear: null,
    classGroups: 0,
    students: 0,
    subjects: 0,
    credits: 0,
    teachers: 0
  });

  useEffect(() => {
    async function loadUserData() {
      try {
        // Check if user is authenticated
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (!data.session) {
          window.location.href = '/login';
          return;
        }
        
        setUser(data.session.user);
        
        // Get teacher data
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', data.session.user.email)
          .single();
          
        if (teacherData) {
          setUser(prevUser => ({
            ...prevUser,
            ...teacherData
          }));
        }

        // Load stats data
        await loadStats();
      } catch (err) {
        console.error('Error loading user data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadUserData();
  }, []);

  const loadStats = async () => {
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
          credits: 0,
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

      // Get students count for current year
      const { count: studentsCount } = await supabase
        .from('enrollments')
        .select('student_id', { count: 'exact', head: true, distinct: true })
        .eq('academic_year_id', currentYearId);

      // Get subjects count for current year
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year_id', currentYearId);

      // Get total credits for current year
      const { count: creditsCount } = await supabase
        .from('enrollments')
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
        students: studentsCount || 0,
        subjects: subjectsCount || 0,
        credits: creditsCount || 0,
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
        credits: 0,
        teachers: 0
      });
    }
  };
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navigateTo = (path) => {
    window.location.href = path;
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
            onClick={() => window.location.href = '/login'}
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

  // Determine which cards to show based on user role
  const isAdmin = user?.is_admin === true;

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
            color: 'white' // Changed to white for better contrast against blue
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
                {user?.name || user?.email}
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
            icon={<School className="text-blue-500" size={20} />}
          />
          <StatCard 
            title="Subjects" 
            value={stats.subjects} 
            icon={<BookOpen className="text-purple-500" size={20} />}
          />
          <StatCard 
            title="Credits Assigned" 
            value={stats.credits} 
            icon={<Award className="text-amber-500" size={20} />}
          />
          <StatCard 
            title="Teachers" 
            value={stats.teachers} 
            icon={<UserCog className="text-teal-500" size={20} />}
          />
        </div>

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
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3.5rem' // Increased margin to create separation
          }}>
            <DashCard 
              title="Academic Years" 
              description="Manage academic years and terms" 
              icon={<Calendar size={24} className="text-indigo-600" />}
              onClick={() => navigateTo('/academic-years')} 
            />
            
            <DashCard 
              title="Teachers" 
              description="Manage teachers and administrators" 
              icon={<UserCog size={24} className="text-teal-600" />}
              onClick={() => navigateTo('/teachers')} 
            />
            
            <DashCard 
              title="Class Groups" 
              description="Manage class groups and assignments" 
              icon={<Users size={24} className="text-emerald-600" />}
              onClick={() => navigateTo('/class-groups')} 
              disabled={true}
            />
            
            <DashCard 
              title="Subjects" 
              description="Manage core and optional subjects" 
              icon={<BookOpen size={24} className="text-purple-600" />}
              onClick={() => navigateTo('/subjects')} 
              disabled={true}
            />
          </div>
        )}
        
        {/* Bottom Row Section Header */}
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1.5rem'
        }}>
          Teacher Functions
        </h3>
        
        {/* Bottom row - Cards for all users */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <DashCard 
            title="Students" 
            description="Manage students and their details" 
            icon={<School size={24} className="text-blue-600" />}
            onClick={() => navigateTo('/students')} 
            disabled={true}
          />
          
          <DashCard 
            title="Credits" 
            description="Award and track student credits" 
            icon={<Award size={24} className="text-amber-600" />}
            onClick={() => navigateTo('/credits')} 
            disabled={true}
          />
          
          <DashCard 
            title="Reports" 
            description="Generate and view reports" 
            icon={<BarChart size={24} className="text-red-600" />}
            onClick={() => navigateTo('/reports')} 
            disabled={true}
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

function DashCard({ title, description, icon, onClick, disabled = false }) {
  return (
    <div 
      style={{ 
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        padding: '1.5rem',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'all 0.2s ease-in-out',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={disabled ? undefined : onClick}
    >
      <div style={{
        marginBottom: '1rem',
        color: disabled ? '#9ca3af' : '#4f46e5'
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '0.5rem'
      }}>
        {title}
      </h3>
      <p style={{
        color: '#6b7280',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        flexGrow: 1
      }}>
        {description}
      </p>
      <div>
        <button 
          disabled={disabled}
          style={{ 
            color: '#4f46e5',
            fontWeight: '500',
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
          {disabled ? 'Coming Soon' : 'Manage →'}
        </button>
      </div>
    </div>
  );
}