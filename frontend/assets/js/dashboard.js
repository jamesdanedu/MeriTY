// dashboard.js - Dashboard page functionality

document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

function initDashboard() {
    // Load the current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Populate academic year selector
    populateAcademicYears();
    
    // Update the stats
    updateStats();
    
    // Load recent credit assignments
    loadRecentCreditAssignments();
    
    // Load top students
    loadTopStudents();
    
    // Add event listener for academic year change
    document.getElementById('academic-year').addEventListener('change', function() {
        updateStats();
        loadRecentCreditAssignments();
        loadTopStudents();
    });
}

function populateAcademicYears() {
    const academicYearSelect = document.getElementById('academic-year');
    if (!academicYearSelect) return;
    
    // Clear existing options
    academicYearSelect.innerHTML = '';
    
    // Add academic years from dummy data
    window.dummyData.academicYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.id;
        option.textContent = year.name;
        academicYearSelect.appendChild(option);
    });
    
    // Select the first (current) academic year by default
    if (window.dummyData.academicYears.length > 0) {
        academicYearSelect.value = window.dummyData.academicYears[0].id;
    }
}

function updateStats() {
    const selectedAcademicYearId = parseInt(document.getElementById('academic-year').value);
    
    // Update total students
    document.getElementById('total-students').textContent = 
        window.dummyData.students.length;
    
    // Update total subjects (filtered by academic year)
    document.getElementById('total-subjects').textContent = 
        window.dummyData.subjects.filter(s => s.academic_year_id === selectedAcademicYearId).length;
    
    // Update total class groups (filtered by academic year)
    document.getElementById('total-class-groups').textContent = 
        window.dummyData.classGroups.filter(cg => cg.academic_year_id === selectedAcademicYearId).length;
    
    // Update total teachers
    document.getElementById('total-teachers').textContent = 
        window.dummyData.teachers.length;
}

function loadRecentCreditAssignments() {
    const recentCreditsElement = document.getElementById('recent-credits');
    if (!recentCreditsElement) return;
    
    // Clear existing content
    recentCreditsElement.innerHTML = '';
    
    // Combine all credit assignments (enrollments, work experience, portfolios)
    const creditAssignments = [
        ...window.dummyData.enrollments.map(enrollment => {
            const student = window.dummyData.students.find(s => s.id === enrollment.student_id);
            const subject = window.dummyData.subjects.find(s => s.id === enrollment.subject_id);
            
            return {
                type: 'Subject',
                student: student ? student.name : 'Unknown Student',
                description: subject ? subject.name : 'Unknown Subject',
                credits: enrollment.credits_earned,
                // No timestamp in dummy data, so we'll create a random one
                timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
            };
        }),
        ...window.dummyData.workExperience.map(experience => {
            const student = window.dummyData.students.find(s => s.id === experience.student_id);
            
            return {
                type: 'Work Experience',
                student: student ? student.name : 'Unknown Student',
                description: experience.company,
                credits: experience.credits_earned,
                timestamp: new Date(experience.end_date)
            };
        }),
        ...window.dummyData.portfolios.map(portfolio => {
            const student = window.dummyData.students.find(s => s.id === portfolio.student_id);
            
            return {
                type: 'Portfolio',
                student: student ? student.name : 'Unknown Student',
                description: portfolio.title,
                credits: portfolio.credits_earned,
                timestamp: new Date(portfolio.submission_date)
            };
        })
    ];
    
    // Sort by timestamp (most recent first)
    creditAssignments.sort((a, b) => b.timestamp - a.timestamp);
    
    // Take only the 5 most recent
    const recentAssignments = creditAssignments.slice(0, 5);
    
    if (recentAssignments.length === 0) {
        recentCreditsElement.innerHTML = `
            <li class="py-3 text-center text-gray-500">
                No recent credit assignments
            </li>
        `;
        return;
    }
    
    // Create list items for each recent assignment
    recentAssignments.forEach(assignment => {
        const li = document.createElement('li');
        li.className = 'py-3 flex items-center justify-between';
        
        // Format the date
        const formattedDate = assignment.timestamp.toLocaleDateString();
        
        li.innerHTML = `
            <div>
                <div class="font-medium">${assignment.student}</div>
                <div class="text-sm text-gray-500">
                    ${assignment.type}: ${assignment.description}
                </div>
            </div>
            <div class="flex items-center">
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-2">
                    ${assignment.credits} credits
                </span>
                <span class="text-xs text-gray-500">${formattedDate}</span>
            </div>
        `;
        
        recentCreditsElement.appendChild(li);
    });
}

function loadTopStudents() {
    const topStudentsElement = document.getElementById('top-students');
    if (!topStudentsElement) return;
    
    // Clear existing content
    topStudentsElement.innerHTML = '';
    
    // Calculate total credits for each student
    const studentCredits = window.dummyData.students.map(student => {
        const totalCredits = window.helpers.getStudentTotalCredits(student.id);
        
        return {
            id: student.id,
            name: student.name,
            classGroup: window.dummyData.classGroups.find(cg => cg.id === student.class_group_id)?.name || 'Unknown',
            totalCredits
        };
    });
    
    // Sort by total credits (highest first)
    studentCredits.sort((a, b) => b.totalCredits - a.totalCredits);
    
    // Take only the top 5
    const topStudents = studentCredits.slice(0, 5);
    
    if (topStudents.length === 0) {
        topStudentsElement.innerHTML = `
            <li class="py-3 text-center text-gray-500">
                No student data available
            </li>
        `;
        return;
    }
    
    // Create list items for each top student
    topStudents.forEach((student, index) => {
        const li = document.createElement('li');
        li.className = 'py-3 flex items-center justify-between';
        
        // Determine badge color based on ranking
        let badgeColor = 'gray';
        if (index === 0) badgeColor = 'yellow';
        else if (index === 1) badgeColor = 'gray-300';
        else if (index === 2) badgeColor = 'yellow-600';
        
        li.innerHTML = `
            <div class="flex items-center">
                <div class="flex items-center justify-center w-6 h-6 bg-${badgeColor}-100 text-${badgeColor}-800 rounded-full text-sm font-medium mr-3">
                    ${index + 1}
                </div>
                <div>
                    <div class="font-medium">${student.name}</div>
                    <div class="text-sm text-gray-500">${student.classGroup}</div>
                </div>
            </div>
            <div>
                <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    ${student.totalCredits} credits
                </span>
            </div>
        `;
        
        topStudentsElement.appendChild(li);
    });
}