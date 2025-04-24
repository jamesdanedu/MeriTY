// student-credits.js - Student credits detail view functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the student credits page
    initStudentCredits();
    
    // Set up tab switching
    setupTabs();
    
    // Set up print button
    setupPrintButton();
});

// Initialize the student credits view
function initStudentCredits() {
    // Get student ID from URL
    const params = window.helpers.getQueryParams();
    if (!params.id) {
        window.helpers.showToast('Student ID not provided', 'error');
        window.location.href = '../students/index.html';
        return;
    }
    
    // Load student data
    loadStudentData(params.id);
}

// Load student data with all credit sources
function loadStudentData(studentId) {
    // Get student from API
    window.api.request(`students/${studentId}`, 'GET')
        .then(student => {
            // Update page header
            document.getElementById('student-name').textContent = student.name;
            
            // Get the class group
            const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
            const classGroupName = classGroup ? classGroup.name : 'Not Assigned';
            
            document.getElementById('student-details').textContent = `${student.email} | Class: ${classGroupName}`;
            
            // Load credit data
            loadStudentCredits(studentId);
        })
        .catch(error => {
            console.error('Error loading student:', error);
            window.helpers.showToast('Failed to load student data: ' + error.message, 'error');
        });
}

// Load all credit sources for a student
function loadStudentCredits(studentId) {
    // Get all credit data from API
    window.api.request(`credits/student/${studentId}`, 'GET')
        .then(credits => {
            // For the prototype, we'll simulate the API response
            const studentEnrollments = window.dummyData.enrollments.filter(e => e.student_id == studentId);
            const studentWorkExperience = window.dummyData.workExperience.filter(w => w.student_id == studentId);
            const studentPortfolio = window.dummyData.portfolios.filter(p => p.student_id == studentId);
            const studentAttendance = window.dummyData.attendance.filter(a => a.student_id == studentId);
            
            // Calculate total credits from each source
            let subjectCreditsTotal = 0;
            let workExperienceCreditsTotal = 0;
            let portfolioCreditsTotal = 0;
            let attendanceCreditsTotal = 0;
            
            // Subject credits
            studentEnrollments.forEach(enrollment => {
                subjectCreditsTotal += enrollment.credits_earned || 0;
            });
            
            // Work experience credits
            studentWorkExperience.forEach(exp => {
                workExperienceCreditsTotal += exp.credits_earned || 0;
            });
            
            // Portfolio credits
            studentPortfolio.forEach(portfolio => {
                portfolioCreditsTotal += portfolio.credits_earned || 0;
            });
            
            // Attendance credits
            studentAttendance.forEach(attendance => {
                attendanceCreditsTotal += attendance.credits_earned || 0;
            });
            
            // Calculate total credits
            const totalCredits = subjectCreditsTotal + workExperienceCreditsTotal + 
                                portfolioCreditsTotal + attendanceCreditsTotal;
            
            // Update the summary cards
            document.getElementById('total-credits').textContent = totalCredits;
            document.getElementById('subject-credits').textContent = subjectCreditsTotal;
            document.getElementById('work-experience-credits').textContent = workExperienceCreditsTotal;
            document.getElementById('portfolio-credits').textContent = portfolioCreditsTotal;
            document.getElementById('attendance-credits').textContent = attendanceCreditsTotal;
            
            // Load detailed data for each credit source
            loadSubjectCredits(studentId, studentEnrollments);
            loadWorkExperienceCredits(studentId, studentWorkExperience);
            loadPortfolioCredits(studentId, studentPortfolio);
            loadAttendanceCredits(studentId, studentAttendance);
        })
        .catch(error => {
            console.error('Error loading student credits:', error);
            window.helpers.showToast('Failed to load credit data: ' + error.message, 'error');
        });
}

// Load subject enrollments and credits
function loadSubjectCredits(studentId, enrollments) {
    const tableBody = document.getElementById('subjects-table-body');
    if (!tableBody) return;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no subject enrollments found
    if (enrollments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No subject enrollments found for this student.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each subject enrollment
    enrollments.forEach((enrollment, index) => {
        const subject = window.dummyData.subjects.find(s => s.id === enrollment.subject_id);
        if (!subject) return;
        
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Get type-specific styling
        let typeClass = '';
        switch(subject.type) {
            case 'core':
                typeClass = 'bg-blue-100 text-blue-800';
                break;
            case 'optional':
                typeClass = 'bg-green-100 text-green-800';
                break;
            case 'short':
                typeClass = 'bg-yellow-100 text-yellow-800';
                break;
            case 'other':
                typeClass = 'bg-purple-100 text-purple-800';
                break;
            default:
                typeClass = 'bg-gray-100 text-gray-800';
        }
        
        // Calculate credit percentage
        const creditPercentage = Math.round((enrollment.credits_earned / subject.credit_value) * 100);
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${subject.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                    ${subject.type.charAt(0).toUpperCase() + subject.type.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${subject.credit_value}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="text-sm font-medium text-gray-900 mr-2">${enrollment.credits_earned}</div>
                    <div class="w-24 bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${creditPercentage}%"></div>
                    </div>
                </div>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Load work experience credits
function loadWorkExperienceCredits(studentId, workExperiences) {
    const tableBody = document.getElementById('work-experience-table-body');
    if (!tableBody) return;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no work experience found
    if (workExperiences.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No work experience records found for this student.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each work experience
    workExperiences.forEach((experience, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Format dates
        const startDate = window.helpers.formatDate(experience.start_date);
        const endDate = window.helpers.formatDate(experience.end_date);
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${experience.business}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${startDate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${endDate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${experience.credits_earned}</div>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Load portfolio credits
function loadPortfolioCredits(studentId, portfolios) {
    const tableBody = document.getElementById('portfolio-table-body');
    if (!tableBody) return;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no portfolio found
    if (portfolios.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="2" class="px-6 py-4 text-center text-gray-500">
                    No portfolio records found for this student.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each portfolio
    portfolios.forEach((portfolio, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${portfolio.period}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${portfolio.credits_earned}</div>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Load attendance credits
function loadAttendanceCredits(studentId, attendances) {
    const tableBody = document.getElementById('attendance-table-body');
    if (!tableBody) return;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no attendance records found
    if (attendances.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="2" class="px-6 py-4 text-center text-gray-500">
                    No attendance records found for this student.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each attendance record
    attendances.forEach((attendance, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${attendance.period}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${attendance.credits_earned}</div>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Set up tab switching functionality
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
            });
            
            // Add active class to clicked button
            button.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
            button.classList.add('border-blue-500', 'text-blue-600');
            
            // Hide all tab contents
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            // Show selected tab content
            const tabId = button.id.replace('tab-', 'content-');
            document.getElementById(tabId).classList.remove('hidden');
        });
    });
}

// Set up print button functionality
function setupPrintButton() {
    const printButton = document.getElementById('print-btn');
    if (!printButton) return;
    
    printButton.addEventListener('click', () => {
        window.print();
    });
}