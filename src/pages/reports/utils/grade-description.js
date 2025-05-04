// src/reports/utils/grade-description.js

/**
 * Utility functions for generating grade descriptions based on credit achievements
 */

// Credit thresholds for different achievement levels
const CREDIT_THRESHOLDS = {
    DISTINCTION: 250,
    MERIT: 200,
    PASS: 150,
    PARTICIPATION: 100,
    INCOMPLETE: 0
  };
  
  // Grade descriptions for different achievement levels
  const GRADE_DESCRIPTIONS = {
    DISTINCTION: {
      title: 'Distinction',
      description: 'Outstanding achievement across all areas of the program. The student has demonstrated exceptional engagement, creativity, and skill development.',
      recommendation: 'Highly suitable for progression to further education or specialized training.'
    },
    MERIT: {
      title: 'Merit',
      description: 'Very good achievement across the program. The student has shown consistent engagement and development in most areas.',
      recommendation: 'Well prepared for progression to further education.'
    },
    PASS: {
      title: 'Pass',
      description: 'Satisfactory completion of the program. The student has met the basic requirements and shown development in key areas.',
      recommendation: 'Ready for progression with appropriate support.'
    },
    PARTICIPATION: {
      title: 'Participation',
      description: 'Partial completion of the program. The student has participated in some aspects but not fulfilled all requirements.',
      recommendation: 'May benefit from additional support before progression.'
    },
    INCOMPLETE: {
      title: 'Incomplete',
      description: 'Limited participation in the program. The student has not met the minimum requirements for completion.',
      recommendation: 'Requires significant additional support before progression.'
    }
  };
  
  /**
   * Get achievement level based on total credits
   * @param {number} totalCredits - The student's total credits
   * @returns {string} - The achievement level key
   */
  export function getAchievementLevel(totalCredits) {
    if (totalCredits >= CREDIT_THRESHOLDS.DISTINCTION) {
      return 'DISTINCTION';
    } else if (totalCredits >= CREDIT_THRESHOLDS.MERIT) {
      return 'MERIT';
    } else if (totalCredits >= CREDIT_THRESHOLDS.PASS) {
      return 'PASS';
    } else if (totalCredits >= CREDIT_THRESHOLDS.PARTICIPATION) {
      return 'PARTICIPATION';
    } else {
      return 'INCOMPLETE';
    }
  }
  
  /**
   * Get grade description for a student based on total credits
   * @param {number} totalCredits - The student's total credits
   * @returns {Object} - Object containing title, description and recommendation
   */
  export function getGradeDescription(totalCredits) {
    const level = getAchievementLevel(totalCredits);
    return GRADE_DESCRIPTIONS[level];
  }
  
  /**
   * Get all credit thresholds
   * @returns {Object} - The credit thresholds
   */
  export function getCreditThresholds() {
    return { ...CREDIT_THRESHOLDS };
  }
  
  /**
   * Generate a personalized comment based on student achievement
   * @param {Object} student - The student object with credit information
   * @returns {string} - Personalized comment
   */
  export function generatePersonalizedComment(student) {
    const level = getAchievementLevel(student.totalCredits);
    const name = student.name.split(' ')[0]; // Get first name
    
    switch (level) {
      case 'DISTINCTION':
        return `${name} has demonstrated exceptional commitment and achievement throughout the program, consistently going above and beyond expectations.`;
      case 'MERIT':
        return `${name} has shown excellent progress and engagement throughout the program, developing valuable skills and knowledge.`;
      case 'PASS':
        return `${name} has successfully completed the program requirements, showing good development in key areas.`;
      case 'PARTICIPATION':
        return `${name} has participated in the program and shown development in some areas, but would benefit from further engagement.`;
      case 'INCOMPLETE':
        return `${name} has begun the program but needs to increase engagement and completion of activities to demonstrate achievement.`;
      default:
        return `${name} has participated in the program.`;
    }
  }
  
  /**
   * Get credit progress percentage
   * @param {number} totalCredits - The student's total credits
   * @param {string} targetLevel - The target achievement level (optional)
   * @returns {number} - Percentage progress (0-100)
   */
  export function getCreditProgressPercentage(totalCredits, targetLevel = 'MERIT') {
    const target = CREDIT_THRESHOLDS[targetLevel];
    if (!target) return 0;
    
    const percentage = Math.min(100, Math.round((totalCredits / target) * 100));
    return percentage;
  }
  
  /**
   * Get credit progress description
   * @param {number} totalCredits - The student's total credits
   * @returns {string} - Progress description
   */
  export function getCreditProgressDescription(totalCredits) {
    const percentage = getCreditProgressPercentage(totalCredits);
    
    if (percentage >= 100) {
      return 'Target achieved! Congratulations!';
    } else if (percentage >= 80) {
      return 'Excellent progress toward target.';
    } else if (percentage >= 60) {
      return 'Good progress toward target.';
    } else if (percentage >= 40) {
      return 'Steady progress toward target.';
    } else {
      return 'Beginning progress toward target.';
    }
  }