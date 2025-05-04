/**
 * Calculates student's total credits and percentage achievement
 * @param {Object} params
 * @param {number} params.studentId - The student's ID
 * @param {number} params.academicYearId - The academic year ID
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} Credits summary
 */
export async function calculateStudentCredits({ studentId, academicYearId }, supabase) {
    try {
      // Get all credit sources for the student
      const [
        enrollments,
        workExperience,
        portfolios,
        attendance,
        exemptions
      ] = await Promise.all([
        // Get subject enrollments
        supabase
          .from('enrollments')
          .select(`
            credits_earned,
            subjects (
              id,
              name,
              credit_value,
              type
            )
          `)
          .eq('student_id', studentId),
  
        // Get work experience credits
        supabase
          .from('work_experience')
          .select('credits_earned')
          .eq('student_id', studentId),
  
        // Get portfolio credits
        supabase
          .from('portfolios')
          .select('credits_earned')
          .eq('student_id', studentId)
          .eq('academic_year_id', academicYearId),
  
        // Get attendance credits
        supabase
          .from('attendance')
          .select('credits_earned')
          .eq('student_id', studentId),
  
        // Get subject exemptions
        supabase
          .from('subject_exemptions')
          .select('subject_id')
          .eq('student_id', studentId)
      ]);
  
      if (enrollments.error) throw enrollments.error;
      if (workExperience.error) throw workExperience.error;
      if (portfolios.error) throw portfolios.error;
      if (attendance.error) throw attendance.error;
      if (exemptions.error) throw exemptions.error;
  
      // Calculate earned credits
      const subjectCredits = enrollments.data?.reduce((sum, enrollment) => 
        sum + (enrollment.credits_earned || 0), 0) || 0;
  
      const workCredits = workExperience.data?.reduce((sum, work) => 
        sum + (work.credits_earned || 0), 0) || 0;
  
      const portfolioCredits = portfolios.data?.reduce((sum, portfolio) => 
        sum + (portfolio.credits_earned || 0), 0) || 0;
  
      const attendanceCredits = attendance.data?.reduce((sum, record) => 
        sum + (record.credits_earned || 0), 0) || 0;
  
      const totalEarned = subjectCredits + workCredits + portfolioCredits + attendanceCredits;
  
      // Calculate maximum possible credits
      const exemptedSubjectIds = new Set(exemptions.data?.map(e => e.subject_id) || []);
      
      // Calculate max credits excluding exempted subjects
      const maxSubjectCredits = enrollments.data?.reduce((sum, enrollment) => {
        if (exemptedSubjectIds.has(enrollment.subjects.id)) {
          return sum; // Don't count exempted subjects
        }
        return sum + enrollment.subjects.credit_value;
      }, 0) || 0;
  
      // Constants for other credit maximums
      const MAX_WORK_CREDITS = 20;
      const MAX_PORTFOLIO_CREDITS = 20;
      const MAX_ATTENDANCE_CREDITS = 20;
  
      const totalPossible = maxSubjectCredits + MAX_WORK_CREDITS + 
                           MAX_PORTFOLIO_CREDITS + MAX_ATTENDANCE_CREDITS;
  
      // Calculate percentage
      const percentage = (totalEarned / totalPossible) * 100;
  
      // Determine grade descriptor
      let gradeDescriptor;
      if (percentage >= 85) {
        gradeDescriptor = 'Distinction';
      } else if (percentage >= 70) {
        gradeDescriptor = 'Merit I';
      } else if (percentage >= 55) {
        gradeDescriptor = 'Merit II';
      } else if (percentage >= 40) {
        gradeDescriptor = 'Pass';
      } else {
        gradeDescriptor = 'Not Yet Achieved';
      }
  
      // Return comprehensive summary
      return {
        credits: {
          subjects: subjectCredits,
          workExperience: workCredits,
          portfolio: portfolioCredits,
          attendance: attendanceCredits,
          total: totalEarned
        },
        maximums: {
          subjects: maxSubjectCredits,
          workExperience: MAX_WORK_CREDITS,
          portfolio: MAX_PORTFOLIO_CREDITS,
          attendance: MAX_ATTENDANCE_CREDITS,
          total: totalPossible
        },
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
        gradeDescriptor,
        exemptions: Array.from(exemptedSubjectIds)
      };
    } catch (error) {
      console.error('Error calculating credits:', error);
      throw error;
    }
  }
  
  /**
   * Calculates credit summaries for multiple students
   * @param {Object} params
   * @param {number[]} params.studentIds - Array of student IDs
   * @param {number} params.academicYearId - The academic year ID
   * @param {Object} supabase - Supabase client instance
   * @returns {Promise<Object>} Credit summaries keyed by student ID
   */
  export async function calculateBulkStudentCredits({ studentIds, academicYearId }, supabase) {
    const results = {};
    
    // Process in batches of 10 to avoid overloading
    const BATCH_SIZE = 10;
    for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
      const batch = studentIds.slice(i, i + BATCH_SIZE);
      const promises = batch.map(studentId => 
        calculateStudentCredits({ studentId, academicYearId }, supabase)
          .then(result => {
            results[studentId] = result;
          })
          .catch(error => {
            console.error(`Error calculating credits for student ${studentId}:`, error);
            results[studentId] = { error: error.message };
          })
      );
      
      await Promise.all(promises);
    }
    
    return results;
  }
  
  /**
   * Gets term-by-term credit breakdown for a student
   * @param {Object} params
   * @param {number} params.studentId - The student's ID
   * @param {number} params.academicYearId - The academic year ID
   * @param {Object} supabase - Supabase client instance
   * @returns {Promise<Object>} Term-by-term credit breakdown
   */
  export async function getTermCredits({ studentId, academicYearId }, supabase) {
    try {
      const [enrollments, portfolios, attendance] = await Promise.all([
        // Get subject enrollments by term
        supabase
          .from('enrollments')
          .select(`
            credits_earned,
            term,
            subjects (
              id,
              name,
              credit_value,
              type
            )
          `)
          .eq('student_id', studentId),
  
        // Get portfolio credits by term
        supabase
          .from('portfolios')
          .select('credits_earned, period')
          .eq('student_id', studentId)
          .eq('academic_year_id', academicYearId),
  
        // Get attendance credits by term
        supabase
          .from('attendance')
          .select('credits_earned, period')
          .eq('student_id', studentId)
      ]);
  
      if (enrollments.error) throw enrollments.error;
      if (portfolios.error) throw portfolios.error;
      if (attendance.error) throw attendance.error;
  
      // Initialize term structures
      const terms = {
        'Term 1': {
          subjects: 0,
          portfolio: 0,
          attendance: 0
        },
        'Term 2': {
          subjects: 0,
          portfolio: 0,
          attendance: 0
        },
        'Full Year': {
          subjects: 0
        }
      };
  
      // Process enrollments
      enrollments.data?.forEach(enrollment => {
        const term = enrollment.term || 'Full Year';
        terms[term].subjects = (terms[term].subjects || 0) + (enrollment.credits_earned || 0);
      });
  
      // Process portfolios
      portfolios.data?.forEach(portfolio => {
        if (portfolio.period in terms) {
          terms[portfolio.period].portfolio = portfolio.credits_earned || 0;
        }
      });
  
      // Process attendance
      attendance.data?.forEach(record => {
        if (record.period in terms) {
          terms[record.period].attendance = record.credits_earned || 0;
        }
      });
  
      // Calculate totals for each term
      return {
        'Term 1': {
          ...terms['Term 1'],
          total: terms['Term 1'].subjects + terms['Term 1'].portfolio + terms['Term 1'].attendance
        },
        'Term 2': {
          ...terms['Term 2'],
          total: terms['Term 2'].subjects + terms['Term 2'].portfolio + terms['Term 2'].attendance
        },
        'Full Year': {
          ...terms['Full Year'],
          total: terms['Full Year'].subjects
        }
      };
    } catch (error) {
      console.error('Error getting term credits:', error);
      throw error;
    }
  }
  