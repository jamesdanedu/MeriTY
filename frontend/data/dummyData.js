// dummyData.js
const academicYears = [
  { id: 1, name: '2024-2025', start_date: '2024-09-01', end_date: '2025-06-30' },
  { id: 2, name: '2023-2024', start_date: '2023-09-01', end_date: '2024-06-30' },
];

const classGroups = [
  { id: 1, name: 'TY1', academic_year_id: 1 },
  { id: 2, name: 'TY2', academic_year_id: 1 },
  { id: 3, name: 'TY3', academic_year_id: 1 },
];

const students = [
  { 
    id: 1, 
    name: 'John Smith', 
    email: 'john.smith@example.com', 
    class_group_id: 1 
  },
  { 
    id: 2, 
    name: 'Sarah Jones', 
    email: 'sarah.jones@example.com', 
    class_group_id: 1 
  },
  { 
    id: 3, 
    name: 'Michael Brown', 
    email: 'michael.brown@example.com', 
    class_group_id: 2 
  },
  { 
    id: 4, 
    name: 'Emma Wilson', 
    email: 'emma.wilson@example.com', 
    class_group_id: 2 
  },
  { 
    id: 5, 
    name: 'David Lee', 
    email: 'david.lee@example.com', 
    class_group_id: 3 
  },
];

const subjects = [
  { 
    id: 1, 
    name: 'Mathematics', 
    credit_value: 10, 
    type: 'core', 
    academic_year_id: 1 
  },
  { 
    id: 2, 
    name: 'English', 
    credit_value: 10, 
    type: 'core', 
    academic_year_id: 1 
  },
  { 
    id: 3, 
    name: 'Science', 
    credit_value: 10, 
    type: 'core', 
    academic_year_id: 1 
  },
  { 
    id: 4, 
    name: 'Coding', 
    credit_value: 8, 
    type: 'optional', 
    academic_year_id: 1 
  },
  { 
    id: 5, 
    name: 'Art', 
    credit_value: 6, 
    type: 'optional', 
    academic_year_id: 1 
  },
  { 
    id: 6, 
    name: 'Music', 
    credit_value: 6, 
    type: 'optional', 
    academic_year_id: 1 
  },
  { 
    id: 7, 
    name: 'Robotics Workshop', 
    credit_value: 4, 
    type: 'short', 
    academic_year_id: 1 
  },
  { 
    id: 8, 
    name: 'First Aid Training', 
    credit_value: 3, 
    type: 'short', 
    academic_year_id: 1 
  },
  { 
    id: 9, 
    name: 'Guest Speaker Series', 
    credit_value: 2, 
    type: 'other', 
    academic_year_id: 1 
  },
];

const teachers = [
  { 
    id: 1, 
    name: 'James O\'Sullivan', 
    email: 'josullivan@stmarysedenderry.ie', 
    is_admin: true 
  },
  { 
    id: 2, 
    name: 'Emmanuelle Galisson', 
    email: 'egalisson@stmarysedenderry.ie', 
    is_admin: true 
  },
  { 
    id: 3, 
    name: 'Conor McManus', 
    email: 'cmcmanus@stmarysedenderry.ie', 
    is_admin: true 
  },
  { 
    id: 4, 
    name: 'Laura Gavigan', 
    email: 'lgavigan@stmarysedenderry.ie', 
    is_admin: false 
  },
];

const enrollments = [
  { id: 1, student_id: 1, subject_id: 1, credits_earned: 8 },
  { id: 2, student_id: 1, subject_id: 2, credits_earned: 9 },
  { id: 3, student_id: 1, subject_id: 4, credits_earned: 7 },
  { id: 4, student_id: 2, subject_id: 1, credits_earned: 10 },
  { id: 5, student_id: 2, subject_id: 2, credits_earned: 8 },
  { id: 6, student_id: 2, subject_id: 5, credits_earned: 6 },
  { id: 7, student_id: 3, subject_id: 1, credits_earned: 7 },
  { id: 8, student_id: 3, subject_id: 2, credits_earned: 8 },
  { id: 9, student_id: 3, subject_id: 6, credits_earned: 5 },
  { id: 10, student_id: 1, subject_id: 7, credits_earned: 4 },
  { id: 11, student_id: 2, subject_id: 8, credits_earned: 3 },
];

const workExperience = [
  { 
    id: 1, 
    student_id: 1, 
    business: 'Tech Solutions Inc.', 
    start_date: '2024-10-10', 
    end_date: '2024-10-21', 
    credits_earned: 15 
  },
  { 
    id: 2, 
    student_id: 2, 
    business: 'Green Energy Ltd.', 
    start_date: '2024-10-10', 
    end_date: '2024-10-21', 
    credits_earned: 12 
  },
  { 
    id: 3, 
    student_id: 3, 
    business: 'City Hospital', 
    start_date: '2024-11-14', 
    end_date: '2024-11-25', 
    credits_earned: 14 
  },
];

const portfolios = [
  { 
    id: 1, 
    student_id: 1, 
    period: 'Term 1',
    credits_earned: 20 
  },
  { 
    id: 2, 
    student_id: 2, 
    period: 'Term 1',
    credits_earned: 22 
  },
];

const attendance = [
  {
    id: 1,
    student_id: 1,
    period: 'Term 1',
    credits_earned: 5
  },
  {
    id: 2,
    student_id: 2,
    period: 'Term 1',
    credits_earned: 5
  },
  {
    id: 3,
    student_id: 3,
    period: 'Term 1',
    credits_earned: 4
  }
];

// Exporting all data to make it globally available
window.dummyData = {
  academicYears,
  classGroups,
  students,
  subjects,
  teachers,
  enrollments,
  workExperience,
  portfolios,
  attendance
};
