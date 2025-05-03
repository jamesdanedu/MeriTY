import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, FileText, Check, X, Download } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ImportExemptions() {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function checkAuth() {
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

        // Load academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });
          
        if (yearsError) throw yearsError;
        setAcademicYears(yearsData || []);
        
        // Set default to current academic year if available
        const currentYear = yearsData?.find(year => year.is_current);
        if (currentYear) {
          setSelectedYear(currentYear.id);
          
          // Load subjects for current year
          await loadSubjects(currentYear.id);
        } else if (yearsData && yearsData.length > 0) {
          setSelectedYear(yearsData[0].id);
          
          // Load subjects for first year
          await loadSubjects(yearsData[0].id);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const loadSubjects = async (yearId) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('academic_year_id', yearId)
        .order('name', { ascending: true });
        
      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError(err.message);
    }
  };

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
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter(line => line.trim() !== '');
          
          // First line is header
          const header = lines[0].split(',').map(col => col.trim());
          
          // Check if we have the required columns
          const requiredColumns = ['student_name', 'subject_name', 'reason'];
          const headerLower = header.map(h => h.toLowerCase());
          
          const missingColumns = requiredColumns.filter(col => 
            !headerLower.includes(col.toLowerCase())
          );
          
          if (missingColumns.length > 0) {
            setError(`Missing required columns: ${missingColumns.join(', ')}`);
            setCsvData([]);
            return;
          }
          
          // Parse data rows
          const data = lines.slice(1).map(line => {
            const values = line.split(',').map(val => val.trim());
            const row = {};
            
            header.forEach((col, index) => {
              // Normalize column names (remove underscores, lowercase)
              const normalizedCol = col.toLowerCase();
              
              // Map to the expected field names
              if (normalizedCol === 'student_name') row.studentName = values[index] || '';
              else if (normalizedCol === 'subject_name') row.subjectName = values[index] || '';
              else if (normalizedCol === 'reason') row.reason = values[index] || '';
              else if (normalizedCol === 'notes') row.notes = values[index] || '';
              else row[normalizedCol] = values[index] || '';
            });
            
            return row;
          });
          
          setCsvData(data);
        } catch (err) {
          console.error('Error parsing CSV:', err);
          setError('Failed to parse CSV file. Please check the format.');
          setCsvData([]);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to read the file');
        setCsvData([]);
      };
      
      reader.readAsText(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Update the file input value to reflect the dropped file
      if (fileInputRef.current) {
        // Create a DataTransfer object to set the files property
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        fileInputRef.current.files = dataTransfer.files;
      }
      
      // Trigger the file change handler
      handleFileChange({ target: { files: [droppedFile] } });
    }
  };

  const handleYearChange = async (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    
    if (!yearId) {
      setSubjects([]);
      return;
    }
    
    await loadSubjects(yearId);
  };

  const handleImport = async () => {
    if (!csvData.length) {
      setError('No data to import');
      return;
    }

    if (!selectedYear) {
      setError('Please select an academic year');
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
      for (const row of csvData) {
        if (!row.studentName || !row.subjectName || !row.reason) {
          results.failed++;
          results.errors.push({
            row: row,
            error: 'Missing required fields (student name, subject name, or reason)'
          });
          continue;
        }
        
        // Find the student by name
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id, class_groups!inner(academic_year_id)')
          .eq('name', row.studentName)
          .eq('class_groups.academic_year_id', selectedYear)
          .maybeSingle();
          
        if (studentError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Database error finding student: ${studentError.message}`
          });
          continue;
        }
        
        if (!studentData) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Student "${row.studentName}" not found in the selected academic year`
          });
          continue;
        }
        
        // Find the subject by name
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('id')
          .eq('name', row.subjectName)
          .eq('academic_year_id', selectedYear)
          .maybeSingle();
          
        if (subjectError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Database error finding subject: ${subjectError.message}`
          });
          continue;
        }
        
        if (!subjectData) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Subject "${row.subjectName}" not found in the selected academic year`
          });
          continue;
        }
        
        // Check if exemption already exists
        const { data: existingExemption, error: exemptionCheckError } = await supabase
          .from('subject_exemptions')
          .select('id')
          .eq('student_id', studentData.id)
          .eq('subject_id', subjectData.id)
          .maybeSingle();
          
        if (exemptionCheckError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Database error checking for existing exemption: ${exemptionCheckError.message}`
          });
          continue;
        }
        
        if (existingExemption) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `An exemption already exists for this student and subject`
          });
          continue;
        }
        
        // Create the exemption record
        const { error: createError } = await supabase
          .from('subject_exemptions')
          .insert({
            student_id: studentData.id,
            subject_id: subjectData.id,
            reason: row.reason,
            notes: row.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (createError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Error creating exemption: ${createError.message}`
          });
          continue;
        }
        
        results.successful++;
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
    const template = 'student_name,subject_name,reason,notes\nJohn Smith,Mathematics,Medical Certificate,Doctor\'s note dated Jan 2023\nJane Doe,Physical Education,Approved Transfer Student,Transferred from ABC School';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subject_exemptions_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    window.location.href = '/subjects/exemptions';
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
        backgroundColor: '#4f46e5', // Indigo color for subjects
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
          }}>Bulk Import Subject Exemptions</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#4f46e5',
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Exemptions
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
            Upload a CSV file to import multiple subject exemptions at once. Download the template for the correct format.
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
              color: '#4f46e5',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #4f46e5',
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
                  <p style={{ fontWeight: '500' }}>Import Complete</p>
                  <p>Successfully imported {importResults.successful} of {importResults.total} exemptions</p>
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
                    Failed Entries ({importResults.failed})
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
                            Student
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Subject
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
                              {error.row.studentName || '(missing)'}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {error.row.subjectName || '(missing)'}
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
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Import More Exemptions
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
                  Return to Exemptions
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label 
                  htmlFor="academicYear" 
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
                  id="academicYear"
                  name="academicYear"
                  required
                  value={selectedYear}
                  onChange={handleYearChange}
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
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem'
                }}>
                  Students and subjects must be from the selected academic year.
                </p>
              </div>
              
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
                    <FileText size={40} style={{ margin: '0 auto 1rem', color: '#4f46e5' }} />
                    <p style={{ fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>{fileName}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {csvData.length} exemptions ready to import
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearForm();
                      }}
                      style={{ 
                        backgroundColor: 'transparent',
                        color: '#4f46e5',
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
                      The file should contain student name, subject name, reason for exemption, and optional notes
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
                    Preview ({csvData.length} exemptions)
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
                            Student
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Subject
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Reason
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, index) => (
                          <tr key={index} style={{
                            borderBottom: index < Math.min(csvData.length, 5) - 1 ? '1px solid #e5e7eb' : 'none'
                          }}>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {row.studentName}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {row.subjectName}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {row.reason}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {row.notes || '-'}
                            </td>
                          </tr>
                        ))}
                        {csvData.length > 5 && (
                          <tr>
                            <td colSpan={4} style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              textAlign: 'center',
                              fontStyle: 'italic'
                            }}>
                              ... and {csvData.length - 5} more exemptions
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
                  disabled={importing || csvData.length === 0 || !selectedYear}
                  style={{ 
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: (importing || csvData.length === 0 || !selectedYear) ? 'not-allowed' : 'pointer',
                    opacity: (importing || csvData.length === 0 || !selectedYear) ? 0.7 : 1
                  }}
                >
                  {importing ? 'Importing...' : `Import ${csvData.length} Exemptions`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}