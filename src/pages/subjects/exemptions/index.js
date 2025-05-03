// index.js
"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BookOpen, Upload } from 'lucide-react';
import SubjectExemptionsImport from './import';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SubjectExemptions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [exemptions, setExemptions] = useState([]);
  const [importMode, setImportMode] = useState(false);

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

  useEffect(() => {
    async function loadExemptions() {
      if (!selectedYear) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('subject_exemptions')
          .select(`
            id,
            reason,
            created_at,
            subjects (
              name
            ),
            students (
              name,
              email,
              class_groups (
                name
              )
            ),
            teachers (
              name,
              email
            )
          `)
          .eq('subjects.academic_year_id', selectedYear)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setExemptions(data || []);
      } catch (err) {
        console.error('Error loading exemptions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadExemptions();
  }, [selectedYear]);

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const handleImport = () => {
    setImportMode(true);
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
      {importMode ? (
        <SubjectExemptionsImport />
      ) : (
        <>
          <header style={{
            backgroundColor: '#9333ea', // Purple color for exemptions
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
              }}>Subject Exemptions</h1>
              <div style={{
                display: 'flex',
                gap: '0.75rem'
              }}>
                <button
                  onClick={handleImport}
                  style={{ 
                    backgroundColor: 'white',
                    color: '#9333ea',
                    fontWeight: '500',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    gap: '0.25rem'
                  }}
                >
                  <Upload size={16} />
                  Bulk Import
                </button>
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
            </div>
          </header>

          <main style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '1.5rem'
          }}>
            {/* Academic Year Filter */}
            <div style={{
              marginBottom: '1.5rem'
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
                onChange={handleYearChange}
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

            {/* Exemptions List */}
            {exemptions.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                padding: '3rem 1.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  marginBottom: '1rem',
                  color: '#9ca3af'
                }}>
                  <BookOpen size={48} style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  No Exemptions Found
                </h3>
                <p style={{
                  color: '#6b7280',
                  marginBottom: '1.5rem'
                }}>
                  There are no subject exemptions for the selected academic year.
                </p>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                overflow: 'hidden'
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
                        textAlign: 'left',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Student</th>
                      <th style={{
                        textAlign: 'left',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Subject</th>
                      <th style={{
                        textAlign: 'left',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Reason</th>
                      <th style={{
                        textAlign: 'left',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Exempted By</th>
                      <th style={{
                        textAlign: 'left',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exemptions.map((exemption, index) => (
                      <tr key={exemption.id} style={{
                        borderBottom: index < exemptions.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}>
                          <div style={{ fontWeight: '500' }}>{exemption.students.name}</div>
                          {exemption.students.email && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280'
                            }}>{exemption.students.email}</div>
                          )}
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {exemption.students.class_groups?.name || 'No Class Group'}
                          </div>
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {exemption.subjects.name}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {exemption.reason || '-'}
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          <div>{exemption.teachers.name}</div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>{exemption.teachers.email}</div>
                        </td>
                        <td style={{
                          padding: '1rem 1.5rem',
                          fontSize: '0.875rem',
                          color: '#374151'
                        }}>
                          {new Date(exemption.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}