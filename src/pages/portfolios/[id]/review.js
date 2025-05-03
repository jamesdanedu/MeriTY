import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PortfolioReview() {
  const router = useRouter();
  const { id } = router.query;
  
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    creditsEarned: 0,
    interviewComments: '',
    feedback: ''
  });

  useEffect(() => {
    async function loadPortfolioData() {
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
        
        // Load portfolio details
        if (id) {
          const { data: portfolioData, error: portfolioError } = await supabase
            .from('portfolios')
            .select(`
              *,
              academic_years (
                id,
                name
              ),
              students (
                id,
                name,
                email,
                class_groups (
                  id,
                  name
                )
              ),
              teachers (
                id,
                name,
                email
              )
            `)
            .eq('id', id)
            .single();


          if (portfolioError) throw portfolioError;
          
          if (!portfolioData) {
            setError('Portfolio not found');
            return;
          }
          
          setPortfolio(portfolioData);
          
          // Set initial form data
          setFormData({
            creditsEarned: portfolioData.credits_earned || 0,
            interviewComments: portfolioData.interview_comments || '',
            feedback: portfolioData.feedback || ''
          });
        }
      } catch (err) {
        console.error('Error loading portfolio data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadPortfolioData();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for creditsEarned to ensure it's a valid number between 0 and 50
    if (name === 'creditsEarned') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        // Allow empty string for user to type
        if (value === '') {
          setFormData(prev => ({ ...prev, [name]: value }));
        }
        return;
      }
      
      // Clamp value between 0 and 50
      const clampedValue = Math.min(Math.max(numValue, 0), 50);
      setFormData(prev => ({ ...prev, [name]: clampedValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate credits
      const creditsEarned = parseInt(formData.creditsEarned, 10);
      if (isNaN(creditsEarned) || creditsEarned < 0 || creditsEarned > 50) {
        setError('Credits must be a number between 0 and 50');
        setSaving(false);
        return;
      }

      // Get current teacher's ID
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (teacherError) throw teacherError;
      
      if (!teacherData) {
        setError('Teacher not found');
        setSaving(false);
        return;
      }

      // Update portfolio
      const { data, error } = await supabase
        .from('portfolios')
        .update({
          credits_earned: creditsEarned,
          interview_comments: formData.interviewComments || null,
          feedback: formData.feedback || null,
          teacher_id: teacherData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Redirect back to portfolios list
      window.location.href = '/portfolios';
    } catch (err) {
      console.error('Error updating portfolio:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  const goBack = () => {
    window.location.href = '/portfolios';
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
            onClick={goBack}
            style={{ 
              backgroundColor: '#be185d',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Portfolios
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio) {
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
          }}>The portfolio review you're looking for cannot be found.</p>
          <button 
            onClick={goBack}
            style={{ 
              backgroundColor: '#be185d',
              color: 'white',
              fontWeight: '500',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Portfolios
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
        backgroundColor: '#be185d', // Rose color for portfolios
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
          }}>Portfolio Review</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#be185d',
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Portfolios
          </button>
        </div>
      </header>
      
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '1.5rem'
        }}>
          {/* Student Information Section */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '0.25rem'
                }}>
                  {portfolio.students?.name}
                </h2>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  {portfolio.students?.email || 'No email provided'}
                </p>
              </div>
              <div style={{
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}>
                {portfolio.students?.class_groups?.name || 'No Class Group'}
              </div>
            </div>
            <div style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.875rem'
            }}>
              <div>
                <span style={{ color: '#6b7280', marginRight: '0.5rem' }}>Period:</span>
                <span style={{
                  backgroundColor: '#fdf2f8',
                  color: '#be185d',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px'
                }}>
                  {portfolio.period}
                </span>
              </div>
              <div>
                <span style={{ color: '#6b7280', marginRight: '0.5rem' }}>Academic Year:</span>
                <span>{portfolio.academic_years?.name || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Portfolio Review Form */}
          <form onSubmit={handleSubmit}>
            {/* Credits Earned */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="creditsEarned" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Credits Earned
              </label>
              <input
                id="creditsEarned"
                name="creditsEarned"
                type="number"
                min="0"
                max="50"
                value={formData.creditsEarned}
                onChange={handleChange}
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
                Enter credits earned (0-50)
              </p>
            </div>

            {/* Interview Comments */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="interviewComments" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Interview Notes
              </label>
              <textarea
                id="interviewComments"
                name="interviewComments"
                value={formData.interviewComments}
                onChange={handleChange}
                rows="4"
                placeholder="Enter notes from the portfolio interview"
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

            {/* Feedback to Teacher */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="feedback" 
                style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}
              >
                Feedback to Teacher
              </label>
              <textarea
                id="feedback"
                name="feedback"
                value={formData.feedback}
                onChange={handleChange}
                rows="4"
                placeholder="Enter feedback for the student's teacher"
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

            {/* Submit Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '0.75rem' 
            }}>
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
                  backgroundColor: '#be185d',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Portfolio Review'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}