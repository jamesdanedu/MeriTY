import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Certificate Generation Utility Functions
export function calculateGrade(totalCredits, maxPossibleCredits) {
  if (maxPossibleCredits === 0) return 'Fail';
  
  const percentage = (totalCredits / maxPossibleCredits) * 100;
  
  if (percentage < 40) return 'Fail';
  if (percentage < 55) return 'Pass';
  if (percentage < 70) return 'Merit II';
  if (percentage < 85) return 'Merit I';
  return 'Distinction';
}

export async function fetchStudentCertificateData(studentId, academicYearId) {
  try {
    // Fetch student details
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        id, 
        name, 
        email,
        class_groups (
          name,
          academic_years (
            name
          )
        ),
        enrollments (
          credits_earned,
          subjects (
            credit_value
          )
        )
      `)
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;

    // Calculate total credits and max possible credits
    const totalCredits = studentData.enrollments.reduce(
      (sum, enrollment) => sum + (enrollment.credits_earned || 0), 
      0
    );

    const maxPossibleCredits = studentData.enrollments.reduce(
      (sum, enrollment) => sum + enrollment.subjects.credit_value, 
      0
    );

    return {
      studentName: studentData.name,
      academicYear: studentData.class_groups?.academic_years?.name || 'Unknown Year',
      classGroup: studentData.class_groups?.name || 'Unassigned',
      totalCredits,
      maxPossibleCredits,
      grade: calculateGrade(totalCredits, maxPossibleCredits),
      percentage: maxPossibleCredits > 0 
        ? ((totalCredits / maxPossibleCredits) * 100).toFixed(2) 
        : '0.00'
    };
  } catch (error) {
    console.error('Error fetching student certificate data:', error);
    throw error;
  }
}

export function generateCertificatePDF(studentData, logoPath) {
  // Create a new jsPDF instance
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Set background color and border
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(10, 10, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 20, 'F');

  // Add school logo
  if (logoPath) {
    doc.addImage(logoPath, 'PNG', 30, 30, 50, 50);
  }

  // Certificate title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(128, 0, 0); // Dark red
  doc.text('CERTIFICATE OF ACHIEVEMENT', doc.internal.pageSize.width / 2, 100, { align: 'center' });

  // Student details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(`This is to certify that`, doc.internal.pageSize.width / 2, 130, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.text(studentData.studentName, doc.internal.pageSize.width / 2, 150, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(`has successfully completed the ${studentData.academicYear} programme`, doc.internal.pageSize.width / 2, 170, { align: 'center' });

  // Achievement details
  doc.setFontSize(14);
  doc.text(`Grade Achieved: ${studentData.grade}`, doc.internal.pageSize.width / 2, 190, { align: 'center' });
  doc.text(`Total Credits: ${studentData.totalCredits} / ${studentData.maxPossibleCredits}`, doc.internal.pageSize.width / 2, 200, { align: 'center' });
  doc.text(`Percentage: ${studentData.percentage}%`, doc.internal.pageSize.width / 2, 210, { align: 'center' });

  // Signatures area
  doc.setFontSize(12);
  doc.line(50, 250, 100, 250); // Principal signature line
  doc.text('Principal', 75, 260, { align: 'center' });

  doc.line(doc.internal.pageSize.width - 100, 250, doc.internal.pageSize.width - 50, 250); // Coordinator signature line
  doc.text('Transition Year Coordinator', doc.internal.pageSize.width - 75, 260, { align: 'center' });

  // Date
  const currentDate = new Date().toLocaleDateString('en-IE');
  doc.text(`Date: ${currentDate}`, doc.internal.pageSize.width / 2, 280, { align: 'center' });

  return doc;
}

export default function CertificatesPage() {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [schoolLogo, setSchoolLogo] = useState(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Authentication check
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!authData.session) {
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
          await loadStudents(currentYear.id);
        } else if (yearsData?.length > 0) {
          setSelectedYear(yearsData[0].id);
          await loadStudents(yearsData[0].id);
        }

        // Load school logo
        const logoResponse = await fetch('/school-logo.png');
        const logoBlob = await logoResponse.blob();
        setSchoolLogo(URL.createObjectURL(logoBlob));
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    }

    loadInitialData();
  }, []);

  const loadStudents = async (yearId) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, 
          name,
          class_groups (
            academic_year_id
          )
        `)
        .eq('class_groups.academic_year_id', yearId);

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const generateSingleCertificate = async (studentId) => {
    try {
      setLoading(true);
      const studentData = await fetchStudentCertificateData(studentId, selectedYear);
      const pdf = generateCertificatePDF(studentData, schoolLogo);
      pdf.save(`${studentData.studentName}_Certificate.pdf`);
    } catch (err) {
      console.error('Error generating certificate:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateBulkCertificates = async () => {
    try {
      setLoading(true);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      for (const student of students) {
        const studentData = await fetchStudentCertificateData(student.id, selectedYear);
        const studentPDF = generateCertificatePDF(studentData, schoolLogo);
        
        // If not the first student, add a new page
        if (student !== students[0]) {
          pdf.addPage();
        }
        
        // Copy all pages from the student's PDF to the bulk PDF
        const pdfPageCount = studentPDF.internal.getNumberOfPages();
        for (let i = 1; i <= pdfPageCount; i++) {
          pdf.setPage(i);
          pdf.addPage();
          pdf.addImage(
            studentPDF.output('datauristring', { filename: `${studentData.studentName}_Certificate.pdf` }), 
            'PNG', 
            10, 
            10, 
            pdf.internal.pageSize.width - 20, 
            pdf.internal.pageSize.height - 20
          );
        }
      }

      pdf.save(`Bulk_Certificates_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating bulk certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Render the page...
  return (
    <div>
      {/* Render the certificates page with year selection, student list, and generation buttons */}
      <h1>Certificate Generation</h1>
      <p>This is a placeholder for the actual UI implementation.</p>
    </div>
  );
}
