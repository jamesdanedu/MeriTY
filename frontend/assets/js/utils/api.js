// api.js - Comprehensive API communication service
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api';

// Create a base API request function
async function apiRequest(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('access_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const config = {
            method,
            url: `${API_BASE_URL}/${endpoint}`,
            headers,
            ...(data ? { data } : {})
        };

        const response = await axios(config);
        return response.data;
    } catch (error) {
        // Handle error consistently
        const errorMessage = error.response?.data?.detail || 
                             error.response?.data?.message || 
                             'An unexpected error occurred';
        
        // If unauthorized, logout the user
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('currentUser');
            window.location.href = '/pages/login.html';
        }

        // Show error toast
        window.helpers.showToast(errorMessage, 'error');
        
        throw error;
    }
}

// Authentication Service
const authService = {
    async login(email, password) {
        try {
            const response = await apiRequest('auth/login/json', 'POST', { email, password });
            
            // Store token
            localStorage.setItem('access_token', response.access_token);
            
            // Fetch and store user details
            const user = await this.getCurrentUser();
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            return user;
        } catch (error) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('currentUser');
            throw error;
        }
    },

    async getCurrentUser() {
        return apiRequest('users/me');
    },

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('currentUser');
        window.location.href = '/pages/login.html';
    },

    async resetPassword(email) {
        return apiRequest('auth/reset-password', 'POST', { email });
    },

    async changePassword(currentPassword, newPassword) {
        return apiRequest('auth/change-password', 'POST', { 
            current_password: currentPassword, 
            new_password: newPassword 
        });
    }
};

// Academic Years Service
const academicYearsService = {
    async getAll() {
        return apiRequest('academic-years');
    },

    async create(data) {
        return apiRequest('academic-years', 'POST', data);
    },

    async get(id) {
        return apiRequest(`academic-years/${id}`);
    },

    async update(id, data) {
        return apiRequest(`academic-years/${id}`, 'PUT', data);
    },

    async delete(id) {
        return apiRequest(`academic-years/${id}`, 'DELETE');
    },

    async getCurrentAcademicYear() {
        return apiRequest('academic-years/current');
    },

    async getClassGroups(id) {
        return apiRequest(`academic-years/${id}/class-groups`);
    },

    async getSubjects(id) {
        return apiRequest(`academic-years/${id}/subjects`);
    }
};

// Students Service
const studentsService = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`students${queryString ? `?${queryString}` : ''}`);
    },

    async create(data) {
        return apiRequest('students', 'POST', data);
    },

    async get(id) {
        return apiRequest(`students/${id}`);
    },

    async update(id, data) {
        return apiRequest(`students/${id}`, 'PUT', data);
    },

    async delete(id) {
        return apiRequest(`students/${id}`, 'DELETE');
    },

    async getCredits(id) {
        return apiRequest(`students/${id}/credits`);
    },

    async importFromCSV(csvContent) {
        return apiRequest('imports/students', 'POST', { csv_content: csvContent });
    }
};

// Teachers Service
const teachersService = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`teachers${queryString ? `?${queryString}` : ''}`);
    },

    async create(data) {
        return apiRequest('teachers', 'POST', data);
    },

    async get(id) {
        return apiRequest(`teachers/${id}`);
    },

    async update(id, data) {
        return apiRequest(`teachers/${id}`, 'PUT', data);
    },

    async delete(id) {
        return apiRequest(`teachers/${id}`, 'DELETE');
    },

    async importFromCSV(csvContent, sendWelcomeEmails = true) {
        return apiRequest('imports/teachers', 'POST', { 
            csv_content: csvContent,
            send_welcome_emails: sendWelcomeEmails
        });
    }
};

// Subjects Service
const subjectsService = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`subjects${queryString ? `?${queryString}` : ''}`);
    },

    async create(data) {
        return apiRequest('subjects', 'POST', data);
    },

    async get(id) {
        return apiRequest(`subjects/${id}`);
    },

    async update(id, data) {
        return apiRequest(`subjects/${id}`, 'PUT', data);
    },

    async delete(id) {
        return apiRequest(`subjects/${id}`, 'DELETE');
    },

    async importFromCSV(csvContent) {
        return apiRequest('imports/subjects', 'POST', { csv_content: csvContent });
    },

    async getEnrollments(id, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`subjects/${id}/enrollments${queryString ? `?${queryString}` : ''}`);
    }
};

// Class Groups Service
const classGroupsService = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`class-groups${queryString ? `?${queryString}` : ''}`);
    },

    async create(data) {
        return apiRequest('class-groups', 'POST', data);
    },

    async get(id) {
        return apiRequest(`class-groups/${id}`);
    },

    async update(id, data) {
        return apiRequest(`class-groups/${id}`, 'PUT', data);
    },

    async delete(id) {
        return apiRequest(`class-groups/${id}`, 'DELETE');
    },

    async getStudents(id) {
        return apiRequest(`class-groups/${id}/students`);
    }
};

// Credits Service
const creditsService = {
    // Subject Enrollments
    async createEnrollment(data) {
        return apiRequest('credits/enrollments', 'POST', data);
    },

    async bulkCreateEnrollments(data) {
        return apiRequest('credits/enrollments/bulk', 'POST', data);
    },

    async updateEnrollment(id, data) {
        return apiRequest(`credits/enrollments/${id}`, 'PUT', data);
    },

    async deleteEnrollment(id) {
        return apiRequest(`credits/enrollments/${id}`, 'DELETE');
    },

    // Work Experience
    async createWorkExperience(data) {
        return apiRequest('credits/work-experience', 'POST', data);
    },

    async bulkCreateWorkExperience(data) {
        return apiRequest('credits/work-experience/bulk', 'POST', data);
    },

    async updateWorkExperience(id, data) {
        return apiRequest(`credits/work-experience/${id}`, 'PUT', data);
    },

    async deleteWorkExperience(id) {
        return apiRequest(`credits/work-experience/${id}`, 'DELETE');
    },

    // Portfolio
    async createPortfolio(data) {
        return apiRequest('credits/portfolio', 'POST', data);
    },

    async bulkCreatePortfolio(data) {
        return apiRequest('credits/portfolio/bulk', 'POST', data);
    },

    async updatePortfolio(id, data) {
        return apiRequest(`credits/portfolio/${id}`, 'PUT', data);
    },

    async deletePortfolio(id) {
        return apiRequest(`credits/portfolio/${id}`, 'DELETE');
    },

    // Attendance
    async createAttendance(data) {
        return apiRequest('credits/attendance', 'POST', data);
    },

    async bulkCreateAttendance(data) {
        return apiRequest('credits/attendance/bulk', 'POST', data);
    },

    async updateAttendance(id, data) {
        return apiRequest(`credits/attendance/${id}`, 'PUT', data);
    },

    async deleteAttendance(id) {
        return apiRequest(`credits/attendance/${id}`, 'DELETE');
    }
};

// Reports Service
const reportsService = {
    async generateStudentReport(studentId, academicYearId) {
        return apiRequest(`reports/student/${studentId}?academic_year_id=${academicYearId}`);
    },

    async generateClassGroupReport(classGroupId, academicYearId) {
        return apiRequest(`reports/class-group/${classGroupId}?academic_year_id=${academicYearId}`);
    },

    async generateAnnualReports(academicYearId, includeDetailed = true, includeCertificates = true) {
        return apiRequest('reports/annual', 'POST', {
            academic_year_id: academicYearId,
            include_detailed: includeDetailed,
            include_certificates: includeCertificates
        });
    }
};

// Expose services globally
window.apiService = {
    auth: authService,
    academicYears: academicYearsService,
    students: studentsService,
    teachers: teachersService,
    subjects: subjectsService,
    classGroups: classGroupsService,
    credits: creditsService,
    reports: reportsService
};
