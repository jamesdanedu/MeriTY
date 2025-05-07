import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSession } from '@/utils/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function withAuth(WrappedComponent, requireAdmin = false) {
  return function AuthenticatedComponent(props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
      async function checkAuth() {
        try {
          const { session } = getSession();
          
          if (!session) {
            router.push('/login');
            return;
          }

          // Check teacher record for admin status if required
          if (requireAdmin) {
            const { data: teacherData, error: teacherError } = await supabase
              .from('teachers')
              .select('*')
              .eq('email', session.user.email)
              .single();
              
            if (teacherError) {
              throw teacherError;
            }
            
            if (!teacherData || !teacherData.is_admin) {
              router.push('/dashboard');
              return;
            }
          }

          setUser(session.user);
          setLoading(false);
        } catch (err) {
          console.error('Auth check error:', err);
          setError(err.message);
          setLoading(false);
        }
      }

      checkAuth();
    }, [router]);

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
      return null;
    }

    return <WrappedComponent {...props} user={user} />;
  };
}

// Helper function to wrap components that require admin access
export function withAdminAuth(WrappedComponent) {
  return withAuth(WrappedComponent, true);
}