// src/utils/grade-description.js
// Functions for determining grade levels and descriptions

/**
 * Calculate the grade based on total credits and maximum possible credits
 * @param {number} totalCredits - Credits earned by the student
 * @param {number} maxPossibleCredits - Maximum possible credits available
 * @returns {string} - Grade classification
 */
function calculateGrade(totalCredits, maxPossibleCredits) {
    if (maxPossibleCredits === 0) return 'Fail';
    
    const percentage = (totalCredits / maxPossibleCredits) * 100;
    
    if (percentage < 40) return 'Fail';
    if (percentage < 55) return 'Pass';
    if (percentage < 70) return 'Merit II';
    if (percentage < 85) return 'Merit I';
    return 'Distinction';
  }
  
  /**
   * Determine achievement level based on total credits
   * @param {number} totalCredits - Credits earned by the student
   * @returns {string} - Achievement level
   */
  export function getAchievementLevel(totalCredits) {
    if (totalCredits < 160) return 'pass';
    if (totalCredits < 200) return 'merit';
    if (totalCredits < 240) return 'high-merit';
    return 'distinction';
  }
  
  /**
   * Get detailed grade description based on total credits
   * @param {number} totalCredits - Credits earned by the student
   * @returns {object} - Object containing title and description of the grade
   */
  export function getGradeDescription(totalCredits) {
    if (totalCredits < 160) {
      return {
        title: 'Pass',
        description: 'Successfully completed the program with basic requirements met.'
      };
    } else if (totalCredits < 200) {
      return {
        title: 'Merit',
        description: 'Completed the program with a good standard of achievement.'
      };
    } else if (totalCredits < 240) {
      return {
        title: 'Merit I',
        description: 'Completed the program with a high standard of achievement.'
      };
    } else {
      return {
        title: 'Distinction',
        description: 'Completed the program with an excellent standard of achievement.'
      };
    }
  }
  
  /**
   * Fetch student certificate data from the database
   * @param {number} studentId - Student ID
   * @param {number} academicYearId - Academic Year ID
   * @param {Object} supabase - Supabase client instance
   * @returns {Promise<object>} - Certificate data for the student
   */
  export async function fetchStudentCertificateData(studentId, academicYearId, supabase) {
    try {
      // Step 1: Fetch the basic student information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, email, class_group_id')
        .eq('id', studentId)
        .single();
        
      if (studentError) throw studentError;
      if (!student) throw new Error('Student not found');
      
      // Step 2: Fetch class group information
      let classGroupName = 'Unassigned';
      let academicYearName = 'Unknown Year';
      
      if (student.class_group_id) {
        const { data: classGroup, error: classGroupError } = await supabase
          .from('class_groups')
          .select('name, academic_year_id, academic_years(name)')
          .eq('id', student.class_group_id)
          .single();
          
        if (!classGroupError && classGroup) {
          classGroupName = classGroup.name;
          academicYearName = classGroup.academic_years?.name || academicYearName;
        }
      }
      
      // Step 3: Fetch all enrollments for this student
      // UPDATED: Now selecting term1_credits and term2_credits instead of credits_earned
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, subject_id, term1_credits, term2_credits')
        .eq('student_id', studentId);
        
      if (enrollmentsError) throw enrollmentsError;
      
      // Step 4: Fetch subject information for these enrollments
      const subjectIds = enrollments
        .filter(e => e.subject_id)
        .map(e => e.subject_id);
        
      let subjects = [];
      if (subjectIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, credit_value')
          .in('id', subjectIds);
          
        if (!subjectsError) {
          subjects = subjectsData || [];
        }
      }
      
      // Step 5: Calculate credits
      // UPDATED: Calculate using term1_credits and term2_credits instead of credits_earned
      let totalCredits = 0;
      let maxPossibleCredits = 0;
      
      enrollments.forEach(enrollment => {
        // Add term1 and term2 credits
        const term1Credits = enrollment.term1_credits || 0;
        const term2Credits = enrollment.term2_credits || 0;
        totalCredits += term1Credits + term2Credits;
        
        // Find the subject for this enrollment
        const subject = subjects.find(s => s.id === enrollment.subject_id);
        if (subject) {
          maxPossibleCredits += subject.credit_value || 0;
        }
      });
      
      // Return combined data
      return {
        studentName: student.name,
        academicYear: academicYearName,
        classGroup: classGroupName,
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
  
  
  /**
   * Generate a PDF certificate
   * @param {object} studentData - Student data for the certificate
   * @param {string} logoPath - Path to the school logo
   * @returns {object} - PDF document
   */
  export function generateCertificatePDF(studentData, logoPath) {
    // This is a placeholder that would typically use jsPDF
    console.log('Generating certificate PDF for', studentData.studentName);
    
    // In a real implementation, you would use jsPDF to create a PDF
    // For now, we'll just return a mock PDF object
    return {
      output: (type) => {
        return `Mock PDF output for ${studentData.studentName} in ${type} format`;
      },
      save: (filename) => {
        console.log(`Saving mock PDF as ${filename}`);
      }
    };
  }
  
  export default {
    calculateGrade,
    getAchievementLevel,
    getGradeDescription,
    fetchStudentCertificateData,
    generateCertificatePDF
  };