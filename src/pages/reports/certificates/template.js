// src/reports/certificates/template.js

/**
 * Certificate templates for different achievement levels
 */

// Base certificate HTML template
export function getBaseCertificateTemplate() {
    return `
      <div class="certificate-container">
        <div class="certificate-header">
          <div class="school-logo"></div>
          <h1 class="certificate-title">CERTIFICATE OF ACHIEVEMENT</h1>
          <h2 class="certificate-program">TRANSITION YEAR PROGRAM</h2>
        </div>
        
        <div class="certificate-content">
          <p class="certificate-declaration">This is to certify that</p>
          <h2 class="student-name">{{STUDENT_NAME}}</h2>
          <p class="certificate-statement">
            has successfully completed the Transition Year Program
            with an achievement level of
          </p>
          <h3 class="achievement-level">{{ACHIEVEMENT_LEVEL}}</h3>
          <p class="credit-statement">having earned <span class="credit-count">{{TOTAL_CREDITS}}</span> credits</p>
        </div>
        
        <div class="certificate-footer">
          <div class="signature-section">
            <div class="signature-line">
              <span class="signature-placeholder">{{PRINCIPAL_SIGNATURE}}</span>
            </div>
            <p class="signature-title">School Principal</p>
          </div>
          
          <div class="certificate-date">
            <p>{{CERTIFICATE_DATE}}</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-line">
              <span class="signature-placeholder">{{COORDINATOR_SIGNATURE}}</span>
            </div>
            <p class="signature-title">Program Coordinator</p>
          </div>
        </div>
        
        <div class="certificate-seal"></div>
      </div>
    `;
  }
  
  // CSS styles for certificate
  export function getCertificateStyles() {
    return `
      .certificate-container {
        width: 210mm;
        height: 297mm;
        padding: 20mm;
        margin: 0 auto;
        background-color: #fff;
        background-image: url('/assets/certificate-background.png');
        background-size: cover;
        background-repeat: no-repeat;
        font-family: 'Times New Roman', Times, serif;
        color: #333;
        position: relative;
        box-sizing: border-box;
      }
      
      .certificate-header {
        text-align: center;
        margin-bottom: 30mm;
      }
      
      .school-logo {
        background-image: url('/assets/school-logo.png');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        height: 30mm;
        margin-bottom: 10mm;
      }
      
      .certificate-title {
        font-size: 36pt;
        font-weight: bold;
        color: #9c7a2e;
        margin: 0;
        letter-spacing: 4px;
      }
      
      .certificate-program {
        font-size: 24pt;
        margin-top: 5mm;
        letter-spacing: 2px;
      }
      
      .certificate-content {
        text-align: center;
        margin-bottom: 40mm;
      }
      
      .certificate-declaration {
        font-size: 14pt;
        margin-bottom: 5mm;
      }
      
      .student-name {
        font-size: 30pt;
        color: #2c3e50;
        border-bottom: 1px solid #9c7a2e;
        display: inline-block;
        padding: 0 10mm 2mm 10mm;
        margin: 5mm 0 10mm 0;
      }
      
      .certificate-statement {
        font-size: 14pt;
        margin-bottom: 5mm;
      }
      
      .achievement-level {
        font-size: 24pt;
        color: #9c7a2e;
        margin: 5mm 0;
      }
      
      .credit-statement {
        font-size: 14pt;
        margin-top: 5mm;
      }
      
      .credit-count {
        font-weight: bold;
      }
      
      .certificate-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 20mm;
      }
      
      .signature-section {
        text-align: center;
        width: 30%;
      }
      
      .signature-line {
        border-bottom: 1px solid #333;
        min-height: 15mm;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      
      .signature-title {
        margin-top: 2mm;
        font-size: 12pt;
      }
      
      .certificate-date {
        text-align: center;
        font-size: 14pt;
      }
      
      .certificate-seal {
        position: absolute;
        bottom: 40mm;
        right: 40mm;
        width: 30mm;
        height: 30mm;
        background-image: url('/assets/certificate-seal.png');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        opacity: 0.8;
      }
      
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .certificate-container {
          box-shadow: none;
        }
      }
    `;
  }
  
  // Template variations for different achievement levels
  export function getDistinctionTemplate() {
    const baseTemplate = getBaseCertificateTemplate();
    return baseTemplate.replace('achievement-level">{{ACHIEVEMENT_LEVEL}}', 
      'achievement-level distinction-level">{{ACHIEVEMENT_LEVEL}}');
  }
  
  export function getMeritTemplate() {
    const baseTemplate = getBaseCertificateTemplate();
    return baseTemplate.replace('achievement-level">{{ACHIEVEMENT_LEVEL}}', 
      'achievement-level merit-level">{{ACHIEVEMENT_LEVEL}}');
  }
  
  export function getPassTemplate() {
    const baseTemplate = getBaseCertificateTemplate();
    return baseTemplate.replace('achievement-level">{{ACHIEVEMENT_LEVEL}}', 
      'achievement-level pass-level">{{ACHIEVEMENT_LEVEL}}');
  }
  
  // Function to get the appropriate template based on credit level
  export function getCertificateTemplate(totalCredits) {
    if (totalCredits >= 250) {
      return getDistinctionTemplate();
    } else if (totalCredits >= 200) {
      return getMeritTemplate();
    } else {
      return getPassTemplate();
    }
  }
  
  // Function to format certificate date
  export function formatCertificateDate(date = new Date()) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-IE', options);
  }