import React, { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, FileText, Check, X, Download } from 'lucide-react';
import { withAdminAuth } from '@/contexts/withAuth';
import { generateSalt, hashPassword, generateTemporaryPassword } from '@/utils/password';
import { sendTeacherEmail } from '@/utils/emailClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function ImportTeachers({ user }) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [sendEmails, setSendEmails] = useState(true);
  const fileInputRef = useRef(null);

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
          const requiredColumns = ['name', 'email'];
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
              row[col.toLowerCase()] = values[index] || '';
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
    
    setImporting(true);
    setError(null);
    
    const results = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: [],
      credentials: [] // Store credentials when emails are disabled
    };
    
    try {
      for (const row of csvData) {
        if (!row.name || !row.email) {
          results.failed++;
          results.errors.push({
            row: row,
            error: 'Missing name or email'
          });
          continue;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          results.failed++;
          results.errors.push({
            row: row,
            error: 'Invalid email format'
          });
          continue;
        }
        
        const { data: existingTeacher, error: checkError } = await supabase
          .from('teachers')
          .select('email')
          .eq('email', row.email)
          .maybeSingle();
          
        if (checkError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Database error: ${checkError.message}`
          });
          continue;
        }
        
        if (existingTeacher) {
          results.failed++;
          results.errors.push({
            row: row,
            error: 'Teacher with this email already exists'
          });
          continue;
        }

        // Generate temporary password
        const tempPassword = generateTemporaryPassword();
        const salt = generateSalt();
        const hashedPassword = hashPassword(tempPassword, salt);
        
        // Determine if the teacher should be an admin
        const isAdmin = row.admin ? 
          row.admin.toLowerCase() === 'yes' || 
          row.admin.toLowerCase() === 'true' || 
          row.admin === '1' : false;
          
        // Determine if the teacher should be active
        const isActive = row.active === undefined || 
          row.active === null || 
          row.active === '' ? 
          true : 
          row.active.toLowerCase() === 'yes' || 
          row.active.toLowerCase() === 'true' || 
          row.active === '1';
        
        // Create teacher record
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .insert({
            name: row.name,
            email: row.email,
            is_admin: isAdmin,
            is_active: isActive,
            password_hash: hashedPassword,
            password_salt: salt,
            must_change_password: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (teacherError) {
          results.failed++;
          results.errors.push({
            row: row,
            error: `Error creating teacher: ${teacherError.message}`
          });
          continue;
        }

        // Handle email sending based on sendEmails setting
        if (sendEmails) {
          try {
            await sendTeacherEmail('newTeacher', {
              name: row.name,
              email: row.email,
              password: tempPassword
            });
          } catch (emailError) {
            console.warn('Failed to send welcome email:', emailError);
            results.credentials.push({
              name: row.name,
              email: row.email,
              password: tempPassword
            });
          }
        } else {
          // Store credentials for display
          results.credentials.push({
            name: row.name,
            email: row.email,
            password: tempPassword
          });
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
    const template = 'Name,Email,Admin,Active\nJohn Doe,john.doe@school.edu,No,Yes\nJane Smith,jane.smith@school.edu,Yes,Yes';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    window.location.href = '/teachers';
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      width: '100%'
    }}>
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
          }}>Bulk Import Teachers</h1>
          <button
            onClick={goBack}
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
            <span style={{ marginRight: '0.25rem' }}>←</span> Back to Teachers
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
            Upload a CSV file to import multiple teachers at once. Download the template for the correct format.
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
                  <p>Successfully imported {importResults.successful} of {importResults.total} teachers</p>
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

              {/* Display credentials when emails are disabled or failed */}
              {importResults.credentials.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Teacher Credentials
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
                            Temporary Password
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.credentials.map((cred, index) => (
                          <tr key={index} style={{
                            borderBottom: index < importResults.credentials.length - 1 ? '1px solid #e5e7eb' : 'none'
                          }}>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {cred.name}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {cred.email}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {cred.password}
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
                  Import More Teachers
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
                  Return to Teachers
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    id="sendEmails"
                    name="sendEmails"
                    type="checkbox"
                    checked={sendEmails}
                    onChange={(e) => setSendEmails(e.target.checked)}
                    style={{ 
                      marginRight: '0.5rem'
                    }}
                  />
                  <label 
                    htmlFor="sendEmails" 
                    style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '500', 
                      color: '#374151'
                    }}
                  >
                    Send Email Notifications
                  </label>
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem',
                  marginLeft: '1.5rem'
                }}>
                  If enabled, teachers will receive emails with their login credentials. If disabled, credentials will be displayed in the results.
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
                      {csvData.length} teachers ready to import
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
                      The file should contain columns for Name, Email, and optionally Admin and Active status
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
                    Preview ({csvData.length} teachers)
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
                            Admin
                          </th>
                          <th style={{
                            textAlign: 'left',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Active
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
                              {row.email}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {row.admin ? (
                                ['yes', 'true', '1'].includes(row.admin.toLowerCase()) ? 'Yes' : 'No'
                              ) : 'No'}
                            </td>
                            <td style={{
                              padding: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#111827'
                            }}>
                              {row.active === undefined || row.active === null || row.active === '' ? 'Yes' : 
                                ['yes', 'true', '1'].includes(row.active.toLowerCase()) ? 'Yes' : 'No'}
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
                              ... and {csvData.length - 5} more teachers
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
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: (importing || csvData.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (importing || csvData.length === 0) ? 0.7 : 1
                  }}
                >
                  {importing ? 'Importing...' : `Import ${csvData.length} Teachers`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default withAdminAuth(ImportTeachers);