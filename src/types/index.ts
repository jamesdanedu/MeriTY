import { Database } from './database.types';

export type Teacher = Database['public']['Tables']['teachers']['Row'];
export type AcademicYear = Database['public']['Tables']['academic_years']['Row'];
export type ClassGroup = Database['public']['Tables']['class_groups']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Subject = Database['public']['Tables']['subjects']['Row'];
export type Enrollment = Database['public']['Tables']['enrollments']['Row'];
export type WorkExperience = Database['public']['Tables']['work_experience']['Row'];
export type Portfolio = Database['public']['Tables']['portfolios']['Row'];
export type Attendance = Database['public']['Tables']['attendance']['Row'];

// Add some additional custom types for the application
export type SubjectType = 'core' | 'optional' | 'short' | 'other';
export type Term = 'Term 1' | 'Term 2' | 'Full Year';
export type Period = 'Term 1' | 'Term 2';

// Add types for joined data
export type ClassGroupWithAcademicYear = ClassGroup & {
  academic_years?: {
    name: string;
  };
  studentCount?: number;
};

export type StudentWithClassGroup = Student & {
  class_groups?: {
    name: string;
  };
};

