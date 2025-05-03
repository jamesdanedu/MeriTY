// File: src/subjects/enroll/[id]/import.js
import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, FileText, Check, X, Download } from 'lucide-react';
import { useRouter } from 'next/router';
import Papa from 'papaparse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BulkEnrollStudentsForSubject() {
  const router = useRouter();
  const { id } = router.query; // Get the subject ID from the URL
  
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [subject, setSubject] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

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

        // Check if user is authorized
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', authData.session.user.email)
          .single();
          
        if (teacherError) {
          throw teacherError;
        }
        
        if (!teacherData) {
          window.location.href = '/login';
          return;
        }
        
        // Load subject details if we have an ID
        if (id) {
          const { data: subjectData, error: subjectError } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .single();
            
          if (subjectError) {
            throw subjectError;
          }
          
          if (!subjectData) {
            throw new Error('Subject not found');
          }
          
          setSubject(subjectData);
        } else {
          throw new Error('No subject ID provided');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        setFile(null);
        setFileName('');
        setCsvData([]);
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const { data, errors, meta } = results;
          
          if (errors.length > 0) {
            console.error('CSV parsing errors:', errors);
            setError('Error parsing CSV file. Please check the format.');
            setCsvData([]);
            return;
          }
          
          // Check if required columns exist
          const headers = meta.fields.map(f => f.toLowerCase());
          if (!headers.includes('student_name') && !headers.includes('name')) {
            setError('CSV must contain a column named "Student Name" or "Name"');
            setCsvData([]);
            return;
          }
          
          // Standardize data format
          const standardizedData = data.map(row => {
            // Find the name field (could be 'Student Name' or 'Name')
            const name = row['Student Name'] || row['student_name'] || row['Name'] || row['name'];
            
            // Extract email if available
            const email = row['Email'] || row['email'] || '';
            
            // Extract class group if available
            const classGroup = row['Class Group'] || row['class_group'] || row['Class'] || row['class'] || '';
            
            return {
              name: name ? name.trim() : '',
              email: email ? email.trim() : '',
              classGroup: classGroup ? classGroup.trim() : '',
              originalRow: row
            };
          });
          
          setCsvData(standardizedData.filter(row => row.name));
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          setError('Failed to parse CSV file. Please check the format.');
          setCsvData([]);
        }
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        fileInputRef.current.files = dataTransfer.files;
      }
      
      handleFileChange({ target: { files: [droppedFile] } });
    }
  };

  const handleImport = async () => {
    if (!csvData.length) {
      setError('No data to import');
      return;
    }
    
    // For subject enrollment, we need a subject ID
    if (!id || !subject) {
      setError('Subject not found');
      return;
    }
    
    setImporting(true);
    setError(null);
    
    const results = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    try {
      // Process each student in the CSV
      for (const student of csvData) {
        try {
          // Find existing student
          let studentQuery = supabase
            .from('students')
            .select('*');
            
          if (student.email) {
            // If email is provided, use it as primary identifier
            studentQuery = studentQuery.eq('email', student.email);
          } else {
            // Otherwise use name (less reliable)
            studentQuery = studentQuery.eq('name', student.name);
          }
          
          const { data: existingStudent, error: studentError } = await studentQuery.maybeSingle();
          
          if (studentError) {
            results.failed++;
            results.errors.push({
              student,
              error: `Database error: ${studentError.message}`
            });
            continue;
          }
          
          if (!existingStudent) {
            results.failed++;
            results.errors.push({
              student,
              error: 'Student not found in the database'
            });
            continue;
          }
          
          // Check if student is already enrolled in this subject
          const { data: existingEnrollment, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('*')
            .eq('student_id', existingStudent.id)
            .eq('subject_id', id)
            .maybeSingle();
            
          if (enrollmentError) {
            results.failed++;
            results.errors.push({
              student,
              error: `Database error: ${enrollmentError.message}`
            });
            continue;
          }
          
          if (existingEnrollment) {
            results.failed++;
            results.errors.push({
              student,
              error: 'Student is already enrolled in this subject'
            });
            continue;
          }
          
          // Create the enrollment
          const { error: insertError } = await supabase
            .from('enrollments')
            .insert({
              student_id: existingStudent.id,
              subject_id: id,
              term: 'Full Year', // Default to full year
              credits_earned: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            results.failed++;
            results.errors.push({
              student,
              error: `Error creating enrollment: ${insertError.message}`
            });
            continue;
          }
          
          results.successful++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            student,
            error: `Unexpected error: ${err.message}`
          });
        }
      }
      
      setImportResults(results);
    } catch (err) {
      console.error('Import error:', err);
      setError(`Error during import: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const clearForm = () => {
    setFile(null);
    setFileName('');
    setCsvData([]);
    setImportResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const downloadTemplate = () => {
    const template = 'Student Name,Email,Class Group\nJohn Smith,john.smith@example.com,TY1\nJane Doe,jane.doe@example.com,TY2';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_enrollment_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    // Navigate back to the enrollment page - NOT to the students page
    window.location.href = '/subjects/enroll';
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
          }}>Enroll Students in {subject?.name || 'Subject'}</h1>
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Subject Enrollment
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
            Upload a CSV file to enroll multiple students in the <strong>{subject?.name || ''}</strong> subject at once. 
            Download the template for the correct format.
          </p>
        </div>
        
        {/* Template download button */}
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={downloadTemplate}
            style={{ 
              backgroundColor: 'white',
              color: '#7c3aed',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #7c3aed',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Download size={16} />
            Download Template
          </button>
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
          
          {importResults ? (
            <div>
              <div style={{
                backgroundColor: importResults.failed === 0 ? '#dcfce7' : '#fef9c3',
                color: importResults.failed === 0 ? '#166534' : '#854d0e',
                padding: '1rem',
                borderRadius: '0.375rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {importResults.failed === 0 ? <Check size={20} /> : null}
                <div>
                  <p style={{ fontWeight: '500' }}>Enrollment Complete</p>
                  <p>Successfully enrolled {importResults.successful} of {importResults.total} students</p>
                </div>
              </div>
              
              {importResults.failed > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Failed Enrollments ({importResults.failed})
                  </h3>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem'
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
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Name
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.errors.map((error, index) => (
                          <tr key={index} style={{
                            borderBottom: index < importResults.errors.length - 1 ? '1px solid #e5e7eb' : 'none'
                          }}>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {error.student.name || '(missing)'}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#b91c1c'
                            }}>
                              {error.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={clearForm}
                  style={{ 
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Enroll More Students
                </button>
                <button
                  onClick={goBack}
                  style={{ 
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer'
                  }}
                >
                  Return to Subject Enrollment
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '2rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                  cursor: 'pointer',
                  backgroundColor: fileName ? '#f3f4f6' : 'transparent'
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {fileName ? (
                  <div>
                    <FileText size={40} style={{ margin: '0 auto 1rem', color: '#7c3aed' }} />
                    <p style={{ fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>{fileName}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {csvData.length} students ready to enroll
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearForm();
                      }}
                      style={{ 
                        backgroundColor: 'transparent',
                        color: '#7c3aed',
                        fontWeight: '500',
                        padding: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        marginTop: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <X size={14} />
                      Clear File
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={40} style={{ margin: '0 auto 1rem', color: '#9ca3af' }} />
                    <p style={{ fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
                      Drag and drop a CSV file, or click to browse
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      The file should contain columns for Student Name and optionally Email and Class Group
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
              
              {csvData.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Preview ({csvData.length} students)
                  </h3>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem'
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
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Name
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Email
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Class Group
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((student, index) => (
                          <tr key={index} style={{
                            borderBottom: index < Math.min(csvData.length, 5) - 1 ? '1px solid #e5e7eb' : 'none'
                          }}>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {student.name}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {student.email || 'Not provided'}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {student.classGroup || 'Not provided'}
                            </td>
                          </tr>
                        ))}
                        {csvData.length > 5 && (
                          <tr>
                            <td colSpan={3} style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              textAlign: 'center',
                              fontStyle: 'italic'
                            }}>
                              ... and {csvData.length - 5} more students
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={goBack}
                  disabled={importing}
                  style={{ 
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    opacity: importing ? 0.7 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || csvData.length === 0}
                  style={{ 
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: (importing || csvData.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (importing || csvData.length === 0) ? 0.7 : 1
                  }}
                >
                  {importing ? 'Enrolling...' : `Enroll ${csvData.length} Students`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}