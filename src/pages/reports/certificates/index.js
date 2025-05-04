// src/reports/certificates/index.js

import { generateCertificate, printCertificate, batchGenerateCertificates, saveCertificateAsPDF } from './generate';
import { getCertificateTemplate, getCertificateStyles, formatCertificateDate } from './template';

/**
 * Main interface for certificate generation and management
 */
export default class CertificateManager {
  constructor(options = {}) {
    this.defaultOptions = {
      principalName: options.principalName || 'School Principal',
      coordinatorName: options.coordinatorName || 'Program Coordinator',
      useSignatures: options.useSignatures || false,
      includeCredits: options.includeCredits !== false,
      schoolInfo: options.schoolInfo || {
        name: 'School Name',
        address: 'School Address',
        logo: '/assets/school-logo.png'
      }
    };
  }
  
  /**
   * Generate a certificate for a student
   * @param {Object} student - Student data
   * @param {Object} options - Certificate options (overrides defaults)
   * @returns {string} - HTML content for the certificate
   */
  generateCertificate(student, options = {}) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return generateCertificate(student, mergedOptions);
  }
  
  /**
   * Print a student's certificate
   * @param {Object} student - Student data
   * @param {Object} options - Certificate options (overrides defaults)
   */
  printStudentCertificate(student, options = {}) {
    const certificateHTML = this.generateCertificate(student, options);
    printCertificate(certificateHTML);
  }
  
  /**
   * Generate and print certificates for multiple students
   * @param {Array} students - Array of student data
   * @param {Object} options - Certificate options (overrides defaults)
   * @returns {string} - Combined HTML content of all certificates
   */
  batchGenerateCertificates(students, options = {}) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return batchGenerateCertificates(students, mergedOptions);
  }
  
  /**
   * Save a student's certificate as PDF
   * @param {Object} student - Student data
   * @param {string} filename - The filename for the PDF
   * @param {Object} options - Certificate options (overrides defaults)
   * @returns {Promise} - Promise that resolves when PDF is saved
   */
  saveCertificateAsPDF(student, filename, options = {}) {
    const certificateHTML = this.generateCertificate(student, options);
    return saveCertificateAsPDF(certificateHTML, filename);
  }
  
  /**
   * Preview a certificate in a modal or new window
   * @param {Object} student - Student data
   * @param {Object} options - Certificate options
   */
  previewCertificate(student, options = {}) {
    const certificateHTML = this.generateCertificate(student, options);
    
    // Create a modal for preview
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.padding = '20px';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Preview';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.padding = '10px 20px';
    closeButton.style.backgroundColor = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
      document.body.removeChild(modal);
    };
    
    // Create iframe to display certificate
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '90%';
    iframe.style.border = 'none';
    iframe.style.backgroundColor = 'white';
    iframe.style.maxWidth = '800px';
    
    modal.appendChild(closeButton);
    modal.appendChild(iframe);
    document.body.appendChild(modal);
    
    // Write certificate HTML to iframe
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(certificateHTML);
    iframe.contentWindow.document.close();
  }
  
  /**
   * Get default certificate options
   * @returns {Object} - The default options
   */
  getDefaultOptions() {
    return { ...this.defaultOptions };
  }
  
  /**
   * Update default certificate options
   * @param {Object} options - New default options
   */
  updateDefaultOptions(options) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }
}

// Export individual functions for direct use
export {
  generateCertificate,
  printCertificate,
  batchGenerateCertificates,
  saveCertificateAsPDF,
  getCertificateTemplate,
  getCertificateStyles,
  formatCertificateDate
};