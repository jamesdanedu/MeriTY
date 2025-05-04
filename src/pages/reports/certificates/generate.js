// src/reports/certificates/generate.js

import { getCertificateTemplate, getCertificateStyles, formatCertificateDate } from './template';
import { getAchievementLevel, getGradeDescription } from '../utils/grade-description';

/**
 * Generate a certificate for a student
 * @param {Object} student - Student data
 * @param {Object} options - Certificate options
 * @returns {string} - HTML content for the certificate
 */
export function generateCertificate(student, options = {}) {
  if (!student || !student.name || !student.totalCredits) {
    throw new Error('Invalid student data for certificate generation');
  }

  // Get the appropriate certificate template based on credit level
  const template = getCertificateTemplate(student.totalCredits);
  
  // Get achievement level based on total credits
  const achievementLevel = getAchievementLevel(student.totalCredits);
  const gradeInfo = getGradeDescription(student.totalCredits);
  
  // Set default options
  const defaultOptions = {
    principalName: options.principalName || 'School Principal',
    coordinatorName: options.coordinatorName || 'Program Coordinator',
    useSignatures: options.useSignatures || false,
    issueDate: options.issueDate || new Date(),
    includeCredits: options.includeCredits !== false
  };
  
  // Merge with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Format certificate date
  const formattedDate = formatCertificateDate(mergedOptions.issueDate);
  
  // Replace template placeholders with actual data
  let certificateHTML = template
    .replace('{{STUDENT_NAME}}', student.name)
    .replace('{{ACHIEVEMENT_LEVEL}}', gradeInfo.title)
    .replace('{{CERTIFICATE_DATE}}', formattedDate);
  
  // Handle credits display
  if (mergedOptions.includeCredits) {
    certificateHTML = certificateHTML.replace('{{TOTAL_CREDITS}}', student.totalCredits);
  } else {
    certificateHTML = certificateHTML.replace('having earned <span class="credit-count">{{TOTAL_CREDITS}}</span> credits', '');
  }
  
  // Handle signatures
  if (mergedOptions.useSignatures) {
    certificateHTML = certificateHTML
      .replace('{{PRINCIPAL_SIGNATURE}}', `<img src="/assets/signatures/${mergedOptions.principalName.toLowerCase().replace(/\s/g, '-')}.png" alt="Principal Signature" class="signature-image" />`)
      .replace('{{COORDINATOR_SIGNATURE}}', `<img src="/assets/signatures/${mergedOptions.coordinatorName.toLowerCase().replace(/\s/g, '-')}.png" alt="Coordinator Signature" class="signature-image" />`);
  } else {
    certificateHTML = certificateHTML
      .replace('{{PRINCIPAL_SIGNATURE}}', '')
      .replace('{{COORDINATOR_SIGNATURE}}', '');
  }
  
  // Add CSS styles
  const styles = getCertificateStyles();
  const fullHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate for ${student.name}</title>
      <style>${styles}</style>
    </head>
    <body>
      ${certificateHTML}
    </body>
    </html>
  `;
  
  return fullHTML;
}

/**
 * Print the certificate
 * @param {string} certificateHTML - The HTML content of the certificate
 */
export function printCertificate(certificateHTML) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow pop-ups to print the certificate.');
    return;
  }
  
  // Write the certificate HTML to the new window
  printWindow.document.write(certificateHTML);
  printWindow.document.close();
  
  // Wait for resources to load before printing
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    // Close the window after printing (optional)
    // printWindow.close();
  };
}

/**
 * Generate and print certificates for multiple students
 * @param {Array} students - Array of student data
 * @param {Object} options - Certificate options
 */
export function batchGenerateCertificates(students, options = {}) {
  if (!Array.isArray(students) || students.length === 0) {
    throw new Error('Invalid student data for batch certificate generation');
  }
  
  // Create a container for all certificates
  let allCertificatesHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificates</title>
      <style>
        ${getCertificateStyles()}
        @media print {
          .certificate-container {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
  `;
  
  // Generate certificate for each student
  students.forEach(student => {
    try {
      // Get just the certificate HTML without the full document structure
      const certificateHTML = generateCertificate(student, options)
        .replace(/<!DOCTYPE html>[\s\S]*<body>/, '')
        .replace(/<\/body>[\s\S]*<\/html>/, '');
      
      allCertificatesHTML += certificateHTML;
    } catch (error) {
      console.error(`Error generating certificate for ${student.name}:`, error);
    }
  });
  
  allCertificatesHTML += `
    </body>
    </html>
  `;
  
  // Open in a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow pop-ups to print the certificates.');
    return;
  }
  
  // Write the certificates HTML to the new window
  printWindow.document.write(allCertificatesHTML);
  printWindow.document.close();
  
  // Wait for resources to load before printing
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
  };
  
  return allCertificatesHTML;
}

/**
 * Save certificate as PDF
 * @param {string} certificateHTML - The HTML content of the certificate
 * @param {string} filename - The filename for the PDF
 * @returns {Promise} - Promise that resolves when PDF is saved
 */
export async function saveCertificateAsPDF(certificateHTML, filename = 'certificate.pdf') {
  // This is a placeholder function
  // In a real implementation, you would use a library like jsPDF or html2pdf.js
  // For now, we'll just print the certificate
  
  alert('PDF export functionality is not implemented in this version. The certificate will be opened for printing instead.');
  printCertificate(certificateHTML);
  
  // Return a resolved promise
  return Promise.resolve({
    success: true,
    message: 'Certificate opened for printing'
  });
}