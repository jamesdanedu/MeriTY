import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, FileText, Check, X, Download } from 'lucide-react';
import Papa from 'papaparse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ImportStudents() {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState(null);
  const [classGroups, setClassGroups] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          throw authError;
        }
        
        if (!authData.session) {
          window.location.href = '/login';
          return;
        }

        setUser(authData.session.user);
        
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', authData.session.user.email)
          .single();
          
        if (teacherError) {
          throw teacherError;
        }
        
        if (!teacherData || !teacherData.is_admin) {
          window.location.href = '/dashboard';
          return;
        }

        // Load class groups
        const { data: groups, error: groupError } = await supabase
          .from('class_groups')
          .select('id, name')
          .order('name');

        if (groupError) {
          throw groupError;
        }

        setClassGroups(groups || []);
        setLoading(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

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
          Papa.parse(event.target.result, {
            complete: (results) => {
              console.log('Full parse results:', results);
              const header = results.data[0].map(col => col.trim().toLowerCase());
              
              const requiredColumns = ['name'];
              const headerLower = header.map(h => h.toLowerCase());
              
              const missingColumns = requiredColumns.filter(col => 
                !headerLower.includes(col.toLowerCase())
              );
              
              if (missingColumns.length > 0) {
                setError(`Missing required columns: ${missingColumns.join(', ')}`);
                setCsvData([]);
                return;
              }
              
              const data = results.data.slice(1).map(values => {
                const row = {};
                header.forEach((col, index) => {
                  // Ensure Unicode preservation
                  row[col] = values[index] ? String(values[index]).trim() : '';
                });
                return row;
              });
              
              setCsvData(data);
            },
            encoding: 'UTF-8',
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
          });
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
      
      reader.readAsText(selectedFile, 'UTF-8');
    }
  };

  const handleImport = async () => {
    if (!csvData.length) {
      setError('No data to import');
      return;
    }

    if (!selectedClassGroup) {
      setError('Please select a class group');
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
        // Detailed logging
        console.log('Importing row:', row);
        console.log('Name raw:', row.name);
        console.log('Name char codes:', Array.from(row.name).map(c => c.charCodeAt(0)));

        // Basic validation
        if (!row.name) {
          results.failed++;
          results.errors.push({
            row: row,
            error: 'Missing name'
          });
          continue;
        }

        // Check if student already exists (optional)
        const { data: existingStudent, error: checkError } = await supabase
          .from('students')
          .select('name')
          .eq('name', row.name)
          .maybeSingle();
          
        if (checkError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Database error: ${checkError.message}`
          });
          continue;
        }
        
        if (existingStudent) {
          results.failed++;
          results.errors.push({
            row: row,
            error: 'Student with this name already exists'
          });
          continue;
        }

        // Insert student
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .insert({
            name: row.name,  // Directly use the name as-is
            email: row.email || null,
            class_group_id: selectedClassGroup
          })
          .select()
          .single();
          
        if (studentError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Error creating student: ${JSON.stringify(studentError)}`
          });
          console.error('Student insert error:', studentError);
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
    setSelectedClassGroup(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const downloadTemplate = () => {
    const template = 'Name,Email\nJohn Doe,john@example.com\nBríain Cullinan,briain@example.com';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    window.location.href = '/students';
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
        backgroundColor: 'white',
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
            color: '#111827'
          }}>Bulk Import Students</h1>
          <button
            onClick={goBack}
            style={{ 
              backgroundColor: 'white',
              color: '#4f46e5',
              fontWeight: 500,
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #4f46e5',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Students
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
            Upload a CSV file to import multiple students at once. Download the template for the correct format.
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
              fontWeight: 500,
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
        
        {/* Class Group Selection */}
        {classGroups.length > 0 && (
          <div style={{
            marginBottom: '1.5rem'
          }}>
            <label 
              htmlFor="classGroup" 
              style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}
            >
              Select Class Group *
            </label>
            <select
              id="classGroup"
              value={selectedClassGroup || ''}
              onChange={(e) => setSelectedClassGroup(e.target.value ? parseInt(e.target.value) : null)}
              style={{ 
                width: '100%',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select a Class Group</option>
              {classGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
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
              <p style={{ fontWeight: 500 }}>Error</p>
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
                  <p style={{ fontWeight: 500 }}>Import Complete</p>
                  <p>Successfully imported {importResults.successful} of {importResults.total} students</p>
                </div>
              </div>
              
              {importResults.failed > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
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
                            fontWeight: 600,
                            color: '#374151'
                          }}>
                            Name
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#374151'
                          }}>
                            Email
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
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
                              {error.row.name || '(missing)'}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {error.row.email || '(missing)'}
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
                    fontWeight: 500,
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Import More Students
                </button>
                <button
                  onClick={goBack}
                  style={{ 
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: 500,
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer'
                  }}
                >
                  Return to Students
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
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
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
                }}
              >
                {fileName ? (
                  <div>
                    <FileText size={40} style={{ margin: '0 auto 1rem', color: '#4f46e5' }} />
                    <p style={{ fontWeight: 500, color: '#111827', marginBottom: '0.5rem' }}>{fileName}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {csvData.length} students ready to import
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearForm();
                      }}
                      style={{ 
                        backgroundColor: 'transparent',
                        color: '#4f46e5',
                        fontWeight: 500,
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
                    <p style={{ fontWeight: 500, color: '#111827', marginBottom: '0.5rem' }}>
                      Drag and drop a CSV file, or click to browse
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      The file should contain columns for Name and optionally Email
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
                    fontWeight: 600,
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
                            fontWeight: 600,
                            color: '#374151'
                          }}>
                            Name
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#374151'
                          }}>
                            Email
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
                              {row.name}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {row.email || 'Not provided'}
                            </td>
                          </tr>
                        ))}
                        {csvData.length > 5 && (
                          <tr>
                            <td colSpan={2} style={{
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
                    fontWeight: 500,
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
                  disabled={importing || csvData.length === 0 || !selectedClassGroup}
                  style={{ 
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    fontWeight: 500,
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: (importing || csvData.length === 0 || !selectedClassGroup) ? 'not-allowed' : 'pointer',
                    opacity: (importing || csvData.length === 0 || !selectedClassGroup) ? 0.7 : 1
                  }}
                >
                  {importing ? 'Importing...' : `Import ${csvData.length} Students`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}