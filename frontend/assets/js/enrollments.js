// enrollments.js - Main enrollments functionality for the dashboard page

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the enrollments dashboard
    initEnrollmentsDashboard();
});

// Initialize the enrollments dashboard
function initEnrollmentsDashboard() {
    // Load enrollment statistics
    loadEnrollmentStats();
    
    // Load recent enrollments
    loadRecentEnrollments();
}

// Load enrollment statistics
function loadEnrollmentStats() {
    // Get element references
    const enrolledStudentCount = document.getElementById('enrolled-student-count');
    const activeSubjectCount = document.getElementById('active-subject-count');
    const currentAcademicYear = document.getElementById('current-academic-year');
    
    if (!enrolledStudentCount || !activeSubjectCount || !currentAcademicYear) return;
    
    // In a real application, this would fetch from the API
    // For the prototype, use the dummy data
    
    // Count enrolled students (unique student IDs in enrollments)
    const uniqueStudentIds = new Set();
    window.dummyData.enrollments.forEach(enrollment => {
        uniqueStudentIds.add(enrollment.student_id);
    });
    
    // Count active subjects (unique subject IDs in enrollments)
    const uniqueSubjectIds = new Set();
    window.dummyData.enrollments.forEach(enrollment => {
        uniqueSubjectIds.add(enrollment.subject_id);
    });
    
    // Get the current academic year (first one in the list for demo)
    const academicYear = window.dummyData.academicYears.length > 0 
        ? window.dummyData.academicYears[0].name 
        : 'N/A';
    
    // Update the UI
    enrolledStudentCount.textContent = uniqueStudentIds.size;
    activeSubjectCount.textContent = uniqueSubjectIds.size;
    currentAcademicYear.textContent = academicYear;
}

// Load recent enrollments
function loadRecentEnrollments() {
    const enrollmentsTable = document.getElementById('recent-enrollments-table');
    if (!enrollmentsTable) return;
    
    // In a real application, this would fetch from the API
    // For the prototype, we'll create mock recent enrollments from our dummy data
    
    // Get at most 5 recent enrollments (we'll pretend they're recent)
    const recentEnrollments = window.dummyData.enrollments.slice(0, 5);
    
    if (recentEnrollments.length === 0) {
        enrollmentsTable.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No recent enrollments found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear the table
    enrollmentsTable.innerHTML = '';
    
    // Add enrollment rows
    recentEnrollments.forEach((enrollment, index) => {
        // Get related data
        const student = window.dummyData.students.find(s => s.id === enrollment.student_id);
        const subject = window.dummyData.subjects.find(s => s.id === enrollment.subject_id);
        
        if (!student || !subject) return;
        
        // Determine subject type class
        let typeClass = '';
        let typeText = '';
        
        switch(subject.type) {
            case 'core':
                typeClass = 'bg-blue-100 text-blue-800';
                typeText = 'Core';
                break;
            case 'optional':
                typeClass = 'bg-green-100 text-green-800';
                typeText = 'Optional';
                break;
            case 'short':
                typeClass = 'bg-yellow-100 text-yellow-800';
                typeText = 'Short';
                break;
            default:
                typeClass = 'bg-gray-100 text-gray-800';
                typeText = 'Other';
        }
        
        // Create a random recent date for demo purposes
        const daysAgo = Math.floor(Math.random() * 14); // Random days ago (0-14)
        const enrollmentDate = new Date();
        enrollmentDate.setDate(enrollmentDate.getDate() - daysAgo);
        const formattedDate = enrollmentDate.toLocaleDateString();
        
        // Create the table row
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${student.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${subject.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                    ${typeText}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${formattedDate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="../credits/student-view.html?id=${student.id}" class="text-blue-600 hover:text-blue-900">
                    View Student
                </a>
            </td>
        `;
        
        enrollmentsTable.appendChild(tr);
    });
}
