// src/reports/utils/export-helpers.js

/**
 * Utility functions for exporting data in various formats
 */

// Convert data array to CSV format
export function convertToCSV(data, columns) {
    if (!data || !data.length) {
      return '';
    }
  
    // Create CSV header
    const header = columns.map(col => `"${col.title}"`).join(',');
    
    // Create CSV rows
    const rows = data.map(item => {
      return columns.map(col => {
        const value = item[col.key] !== undefined ? item[col.key] : '';
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    // Combine header and rows
    return [header, ...rows].join('\n');
  }
  
  // Trigger CSV file download
  export function downloadCSV(csvContent, filename = 'export.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Format date for export files
  export function formatDateForFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  // Generate Excel-compatible export function
  export async function exportToExcel(data, columns, filename = 'export') {
    // This is a placeholder - in a real implementation, you would use
    // a library like SheetJS/xlsx to generate Excel files
    // For now, we'll just use CSV as a fallback
    const csvContent = convertToCSV(data, columns);
    const dateStamp = formatDateForFilename();
    downloadCSV(csvContent, `${filename}_${dateStamp}.csv`);
    
    return {
      success: true,
      filename: `${filename}_${dateStamp}.csv`
    };
  }
  
  // Format data for PDF export
  export function preparePDFData(data, columns) {
    return data.map(item => {
      const row = {};
      columns.forEach(col => {
        row[col.title] = item[col.key] !== undefined ? item[col.key] : '';
      });
      return row;
    });
  }
  
  // Get column definitions for common exports
  export function getStudentCreditColumns() {
    return [
      { key: 'name', title: 'Student Name' },
      { key: 'classGroup', title: 'Class Group' },
      { key: 'totalCredits', title: 'Total Credits' },
      { key: 'subjectCredits', title: 'Subject Credits' },
      { key: 'workExperienceCredits', title: 'Work Experience' },
      { key: 'portfolioCredits', title: 'Portfolio' },
      { key: 'attendanceCredits', title: 'Attendance' }
    ];
  }
  
  // Function to sanitize data for export
  export function sanitizeExportData(data) {
    return data.map(item => {
      const sanitized = { ...item };
      // Remove any sensitive or unnecessary fields
      delete sanitized.id;
      delete sanitized.createdAt;
      delete sanitized.updatedAt;
      return sanitized;
    });
  }