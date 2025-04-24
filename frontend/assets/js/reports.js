// reports.js - Reporting functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page based on the current URL
    const path = window.location.pathname;
    
    if (path.endsWith('/index.html') || path.endsWith('/reports/')) {
        initReportsPage();
    } else if (path.includes('student-report.html')) {
        initStudentReportPage();
    }
});

// Initialize the reports index page
function initReportsPage() {
    // Populate dropdowns
    populateStudentDropdown();
    populateClassGroupDropdown();
    populateAcademicYearDropdowns();
    
    // Set up form submission handlers
    setupFormHandlers();
}

// Initialize the student report page
function initStudentReportPage() {
    // Get student ID and academic year from URL
    const params = window.helpers.getQueryParams();
    
    if (params.student_id && params.academic_year_id) {
        loadStudentReport(params.student_id, params.academic_year_id);
    } else {
        window.helpers.showToast('Missing required parameters', 'error');
    }
    
    // Set up print button
    document.getElementById('print-btn')?.addEventListener('click', () => {
        window.print();
    });
    
    // Set up download button
    document.getElementById('download-btn')?.addEventListener('click', () => {
        downloadPDF();
    });
}

// Populate student dropdown
function populateStudentDropdown() {
    const studentSelect = document.getElementById('student-select');
    if (!studentSelect) return;
    
    // Clear existing options (except for the first one)
    const firstOption = studentSelect.options[0];
    studentSelect.innerHTML = '';
    studentSelect.appendChild(firstOption);
    
    // Sort students by name
    const sortedStudents = [...window.dummyData.students].sort((a, b) => 
        a.name.localeCompare(b.name)
    );
    
    // Add students from dummy data
    sortedStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        
        // Get class group if available
        let classGroupName = '';
        if (student.class_group_id) {
            const classGroup = window.dummyData.classGroups.find(
                cg => cg.id === student.class_group_id
            );
            if (classGroup) {
                classGroupName = ` (${classGroup.name})`;
            }
        }
        
        option.textContent = `${student.name}${classGroupName}`;
        studentSelect.appendChild(option);
    });
}

// Populate class group dropdown
function populateClassGroupDropdown() {
    const classGroupSelect = document.getElementById('class-group-select');
    if (!classGroupSelect) return;
    
    // Clear existing options (except for the first one)
    const firstOption = classGroupSelect.options[0];
    classGroupSelect.innerHTML = '';
    classGroupSelect.appendChild(firstOption);
    
    // Add class groups from dummy data
    window.dummyData.classGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        
        // Get academic year if available
        let academicYearName = '';
        if (group.academic_year_id) {
            const academicYear = window.dummyData.academicYears.find(
                ay => ay.id === group.academic_year_id
            );
            if (academicYear) {
                academicYearName = ` (${academicYear.name})`;
            }
        }
        
        option.textContent = `${group.name}${academicYearName}`;
        classGroupSelect.appendChild(option);
    });
}

// Populate academic year dropdowns
function populateAcademicYearDropdowns() {
    const academicYearSelects = [
        document.getElementById('academic-year-select'),
        document.getElementById('academic-year-select-class'),
        document.getElementById('academic-year-select-annual')
    ];
    
    academicYearSelects.forEach(select => {
        if (!select) return;
        
        // Clear existing options (except for the first one)
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        // Add academic years from dummy data
        window.dummyData.academicYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year.id;
            option.textContent = year.name;
            select.appendChild(option);
        });
        
        // Select the first (current) academic year by default
        if (window.dummyData.academicYears.length > 0) {
            select.value = window.dummyData.academicYears[0].id;
        }
    });
}

// Set up form submission handlers
function setupFormHandlers() {
    // Individual student report form
    const individualReportForm = document.getElementById('individual-report-form');
    if (individualReportForm) {
        individualReportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const studentId = document.getElementById('student-select').value;
            const academicYearId = document.getElementById('academic-year-select').value;
            
            if (!studentId || !academicYearId) {
                window.helpers.showToast('Please select both a student and an academic year', 'error');
                return;
            }
            
            // Redirect to the student report page with parameters
            window.location.href = `student-report.html?student_id=${studentId}&academic_year_id=${academicYearId}`;
        });
    }
    
    // Class group report form
    const classReportForm = document.getElementById('class-report-form');
    if (classReportForm) {
        classReportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const classGroupId = document.getElementById('class-group-select').value;
            const academicYearId = document.getElementById('academic-year-select-class').value;
            
            if (!classGroupId || !academicYearId) {
                window.helpers.showToast('Please select both a class group and an academic year', 'error');
                return;
            }
            
            // Generate reports for all students in the class
            generateClassGroupReports(classGroupId, academicYearId);
        });
    }
    
    // Annual report form
    const annualReportForm = document.getElementById('annual-report-form');
    if (annualReportForm) {
        annualReportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const academicYearId = document.getElementById('academic-year-select-annual').value;
            const includeDetailed = document.getElementById('include-detailed-reports').checked;
            const includeCertificates = document.getElementById('include-certificates').checked;
            
            if (!academicYearId) {
                window.helpers.showToast('Please select an academic year', 'error');
                return;
            }
            
            // Generate year-end reports for all students
            generateAnnualReports(academicYearId, includeDetailed, includeCertificates);
        });
    }
}

// Load student report data
function loadStudentReport(studentId, academicYearId) {
    // In a real implementation, this would fetch data from the API
    // For the prototype, we'll use dummy data
    
    // Get the student
    const student = window.dummyData.students.find(s => s.id == studentId);
    if (!student) {
        window.helpers.showToast('Student not found', 'error');
        return;
    }
    
    // Get the academic year
    const academicYear = window.dummyData.academicYears.find(ay => ay.id == academicYearId);
    if (!academicYear) {
        window.helpers.showToast('Academic year not found', 'error');
        return;
    }
    
    // Get class group
    const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
    const classGroupName = classGroup ? classGroup.name : 'Not Assigned';
    
    // Update report header information
    document.getElementById('school-name').textContent = 'Your School Name';
    document.getElementById('report-title').textContent = 'Transition Year Credits Report';
    document.getElementById('academic-year').textContent = `Academic Year: ${academicYear.name}`;
    document.getElementById('student-name').textContent = student.name;
    document.getElementById('class-group').textContent = `Class: ${classGroupName}`;
    
    // Update certificate information
    document.getElementById('cert-school-name').textContent = 'Your School Name';
    document.getElementById('cert-student-name').textContent = student.name;
    document.getElementById('cert-academic-year').textContent = `Academic Year: ${academicYear.name}`;
    
    // Calculate the overall grade
    const overallGrade = calculateOverallGrade(studentId);
    document.getElementById('overall-grade').textContent = `${overallGrade}%`;
    document.getElementById('cert-overall-grade').textContent = `${overallGrade}%`;
    
    // Generate charts and populate tables
    generateTermComparisonChart(studentId);
    generateCoreSubjectsChart(studentId);
    populateCoreSubjectsTable(studentId);
    populateOtherCreditsSection(studentId);
    generateModulesComparisonChart(studentId);
    populateOptionalSubjectsTable(studentId);
    
    // Set teacher comments (would come from portfolio feedback in a real implementation)
    setTeacherComments(studentId);
}

// Calculate overall grade for a student
function calculateOverallGrade(studentId) {
    // In a real implementation, this would use actual credit data
    // For the prototype, we'll return a random value between 60-95
    return Math.floor(Math.random() * 36) + 60;
}

// Generate term comparison chart
function generateTermComparisonChart(studentId) {
    const chartContainer = document.getElementById('term-comparison-chart');
    if (!chartContainer) return;
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
    
    // Sample data - in a real implementation, this would be calculated from actual credit data
    const data = {
        labels: ['Work Experience', 'Portfolio Interview', 'Attendance'],
        datasets: [
            {
                label: 'Term 1',
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1,
                data: [100, 54, 65]
            },
            {
                label: 'Term 2',
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                borderColor: 'rgb(255, 159, 64)',
                borderWidth: 1,
                data: [0, 0, 0]
            }
        ]
    };
    
    // Create chart
    new Chart(canvas, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120
                }
            }
        }
    });
}

// Generate core subjects radar chart
function generateCoreSubjectsChart(studentId) {
    const chartContainer = document.getElementById('core-subjects-chart');
    if (!chartContainer) return;
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
    
    // Sample data - in a real implementation, this would be calculated from actual credit data
    const data = {
        labels: ['English', 'Maths', 'Irish', 'Français/Spanish', 'Science'],
        datasets: [
            {
                label: 'Term 1',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                pointBackgroundColor: 'rgb(54, 162, 235)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(54, 162, 235)',
                data: [60, 50, 95, 90, 40]
            },
            {
                label: 'Term 2',
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgb(255, 159, 64)',
                pointBackgroundColor: 'rgb(255, 159, 64)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(255, 159, 64)',
                data: [40, 30, 10, 5, 30]
            }
        ]
    };
    
    // Create chart
    new Chart(canvas, {
        type: 'radar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Generate TY Modules comparison chart
function generateModulesComparisonChart(studentId) {
    const chartContainer = document.getElementById('modules-comparison-chart');
    if (!chartContainer) return;
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
    
    // Sample data - in a real implementation, this would be calculated from actual credit data
    const data = {
        labels: ['Enterprise', 'IT', 'Home Economics', 'PE', 'Religion', 'Geography/History', 'Guidance/Career', 'Class/Study/Debate', 'Drama/Music/Public', 'SPHE', 'Current Affairs'],
        datasets: [
            {
                label: 'Term 1',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                tension: 0.1,
                fill: false,
                data: [80, 20, 80, 60, 20, 15, 75, 100, 100, 40, 20]
            },
            {
                label: 'Term 2',
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgb(255, 159, 64)',
                tension: 0.1,
                fill: false,
                data: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
            }
        ]
    };
    
    // Create chart
    new Chart(canvas, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120
                }
            }
        }
    });
}

// Populate core subjects table
function populateCoreSubjectsTable(studentId) {
    const tableBody = document.getElementById('core-subjects-body');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Find core subjects for this student
    const coreSubjects = window.dummyData.subjects.filter(subject => 
        subject.type === 'core'
    );
    
    // Sample data - in a real implementation, this would use actual enrollments
    const enrollments = window.dummyData.enrollments.filter(enrollment => 
        enrollment.student_id == studentId && 
        coreSubjects.some(subject => subject.id === enrollment.subject_id)
    );
    
    if (enrollments.length === 0) {
        // No enrollments found
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                No core subject enrollments found
            </td>
        `;
        tableBody.appendChild(tr);
        return;
    }
    
    // Group enrollments by subject
    const subjectEnrollments = {};
    
    enrollments.forEach(enrollment => {
        const subject = window.dummyData.subjects.find(s => s.id === enrollment.subject_id);
        if (!subject) return;
        
        if (!subjectEnrollments[subject.id]) {
            subjectEnrollments[subject.id] = {
                subject: subject,
                terms: {}
            };
        }
        
        // In a real implementation, we would use the actual term data
        // For the prototype, we'll randomly assign to Term 1
        subjectEnrollments[subject.id].terms[1] = enrollment.credits_earned;
    });
    
    // Create table rows
    Object.values(subjectEnrollments).forEach(data => {
        const tr = document.createElement('tr');
        
        // Calculate percentages
        const term1Percent = data.terms[1] ? Math.round((data.terms[1] / data.subject.credit_value) * 100) : 0;
        const term2Percent = data.terms[2] ? Math.round((data.terms[2] / data.subject.credit_value) * 100) : 0;
        const overallPercent = Math.round((term1Percent + term2Percent) / (data.terms[2] ? 2 : 1));
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${data.subject.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">${term1Percent}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">${term2Percent}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">${overallPercent}%</td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Populate Optional Subjects table
function populateOptionalSubjectsTable(studentId) {
    const tableBody = document.getElementById('optional-subjects-body');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Find optional, short, and other subjects for this student
    const optionalSubjects = window.dummyData.subjects.filter(subject => 
        subject.type === 'optional' || subject.type === 'short' || subject.type === 'other'
    );
    
    // Find enrollments for this student
    const enrollments = window.dummyData.enrollments.filter(enrollment => 
        enrollment.student_id == studentId && 
        optionalSubjects.some(subject => subject.id === enrollment.subject_id)
    );
    
    if (enrollments.length === 0) {
        // No enrollments found
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                No optional subject enrollments found
            </td>
        `;
        tableBody.appendChild(tr);
        return;
    }
    
    // Create table rows
    enrollments.forEach((enrollment, index) => {
        const subject = window.dummyData.subjects.find(s => s.id === enrollment.subject_id);
        if (!subject) return;
        
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Calculate percentage
        const percent = Math.round((enrollment.credits_earned / subject.credit_value) * 100);
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${subject.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">${subject.credit_value}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">${enrollment.credits_earned}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">${percent}%</td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Populate "Other Credits" section
function populateOtherCreditsSection(studentId) {
    // Work Experience
    const workExpCredits = document.getElementById('work-experience-credits');
    const workExpDetails = document.getElementById('work-experience-details');
    
    if (workExpCredits && workExpDetails) {
        // Find work experience for this student
        const workExperience = window.dummyData.workExperience.find(exp => 
            exp.student_id == studentId
        );
        
        if (workExperience) {
            // Calculate percentage
            const workExpPercent = 90; // In real implementation, calculate based on data
            workExpCredits.textContent = `${workExpPercent}%`;
            
            // Update progress bar
            const progressBar = workExpCredits.parentElement.nextElementSibling.querySelector('div.bg-yellow-600');
            if (progressBar) {
                progressBar.style.width = `${workExpPercent}%`;
            }
            
            // Update details
            workExpDetails.innerHTML = `
                <p class="text-sm text-gray-600 mb-1">Business: <span class="font-medium">${workExperience.business}</span></p>
                <p class="text-sm text-gray-600">Duration: <span class="font-medium">2 weeks</span></p>
            `;
        } else {
            workExpCredits.textContent = '0%';
            
            // Update progress bar
            const progressBar = workExpCredits.parentElement.nextElementSibling.querySelector('div.bg-yellow-600');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
            
            workExpDetails.innerHTML = `
                <p class="text-sm text-gray-600">No work experience recorded</p>
            `;
        }
    }
    
    // Portfolio
    const portfolioCredits = document.getElementById('portfolio-credits');
    const portfolioDetails = document.getElementById('portfolio-details');
    
    if (portfolioCredits && portfolioDetails) {
        // Find portfolio entries for this student
        const portfolioEntries = window.dummyData.portfolios.filter(p => 
            p.student_id == studentId
        );
        
        if (portfolioEntries.length > 0) {
            // Calculate percentage
            const portfolioPercent = 85; // In real implementation, calculate based on data
            portfolioCredits.textContent = `${portfolioPercent}%`;
            
            // Update progress bar
            const progressBar = portfolioCredits.parentElement.nextElementSibling.querySelector('div.bg-purple-600');
            if (progressBar) {
                progressBar.style.width = `${portfolioPercent}%`;
            }
            
            // Update details
            const term1Entry = portfolioEntries.find(p => p.period === 'Term 1');
            const term2Entry = portfolioEntries.find(p => p.period === 'Term 2');
            
            portfolioDetails.innerHTML = `
                <p class="text-sm text-gray-600 mb-1">Term 1: <span class="font-medium">${term1Entry ? '90%' : 'N/A'}</span></p>
                <p class="text-sm text-gray-600">Term 2: <span class="font-medium">${term2Entry ? '80%' : 'N/A'}</span></p>
            `;
        } else {
            portfolioCredits.textContent = '0%';
            
            // Update progress bar
            const progressBar = portfolioCredits.parentElement.nextElementSibling.querySelector('div.bg-purple-600');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
            
            portfolioDetails.innerHTML = `
                <p class="text-sm text-gray-600">No portfolio entries recorded</p>
            `;
        }
    }
    
    // Attendance
    const attendanceCredits = document.getElementById('attendance-credits');
    const attendanceDetails = document.getElementById('attendance-details');
    
    if (attendanceCredits && attendanceDetails) {
        // Find attendance records for this student
        const attendanceRecords = window.dummyData.attendance.filter(a => 
            a.student_id == studentId
        );
        
        if (attendanceRecords.length > 0) {
            // Calculate percentage
            const attendancePercent = 95; // In real implementation, calculate based on data
            attendanceCredits.textContent = `${attendancePercent}%`;
            
            // Update progress bar
            const progressBar = attendanceCredits.parentElement.nextElementSibling.querySelector('div.bg-pink-600');
            if (progressBar) {
                progressBar.style.width = `${attendancePercent}%`;
            }
            
            // Update details
            const term1Record = attendanceRecords.find(a => a.period === 'Term 1');
            const term2Record = attendanceRecords.find(a => a.period === 'Term 2');
            
            attendanceDetails.innerHTML = `
                <p class="text-sm text-gray-600 mb-1">Term 1: <span class="font-medium">${term1Record ? '95%' : 'N/A'}</span></p>
                <p class="text-sm text-gray-600">Term 2: <span class="font-medium">${term2Record ? '95%' : 'N/A'}</span></p>
            `;
        } else {
            attendanceCredits.textContent = '0%';
            
            // Update progress bar
            const progressBar = attendanceCredits.parentElement.nextElementSibling.querySelector('div.bg-pink-600');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
            
            attendanceDetails.innerHTML = `
                <p class="text-sm text-gray-600">No attendance records</p>
            `;
        }
    }
}

// Set teacher comments
function setTeacherComments(studentId) {
    const commentsContainer = document.getElementById('teacher-comments');
    if (!commentsContainer) return;
    
    // In a real implementation, this would use portfolio feedback data
    // For the prototype, we'll use a generic comment
    commentsContainer.innerHTML = `
        <p>This student has shown good progress throughout the year. Their portfolio work demonstrates their ability to reflect on their learning experiences. The work experience placement provided valuable insights into a potential career path. They have developed good teamwork and communication skills during the year.</p>
    `;
}

