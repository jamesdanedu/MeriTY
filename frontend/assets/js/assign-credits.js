// Set up filter listeners
function setupFilterListeners() {
    // Populate subjects select
    populateSubjectsSelect();
    
    // Subject class group filter
    const classGroupFilter = document.getElementById('class-group-filter');
    if (classGroupFilter) {
        classGroupFilter.addEventListener('change', function() {
            const subjectId = document.getElementById('subject-select').value;
            if (subjectId) {
                loadStudentsForSubject(subjectId);
            }
        });
    }
    
    // Work Experience class group filter
    const workExperienceClassGroupFilter = document.getElementById('class-group-filter-work');
    if (workExperienceClassGroupFilter) {
        workExperienceClassGroupFilter.addEventListener('change', function() {
            loadStudentsForWorkExperience(this.value);
        });
    }
    
    // Portfolio class group filter
    const portfolioClassGroupFilter = document.getElementById('class-group-filter-portfolio');
    if (portfolioClassGroupFilter) {
        portfolioClassGroupFilter.addEventListener('change', function() {
            const period = document.getElementById('portfolio-period').value;
            if (period) {
                loadStudentsForPortfolio(period);
            }
        });
    }
    
    // Portfolio period select
    const portfolioPeriod = document.getElementById('portfolio-period');
    if (portfolioPeriod) {
        portfolioPeriod.addEventListener('change', function() {
            if (this.value) {
                loadStudentsForPortfolio(this.value);
            }
        });
    }
    
    // Attendance academic year filter
    const attendanceAcademicYearFilter = document.getElementById('academic-year-filter-attendance');
    if (attendanceAcademicYearFilter) {
        attendanceAcademicYearFilter.addEventListener('change', function() {
            // When academic year changes, update class groups
            updateClassGroupsForAcademicYear(this.value, 'class-group-filter-attendance');
            
            const period = document.getElementById('attendance-period').value;
            if (period) {
                loadStudentsForAttendance(period);
            }
        });
    }
    
    // Attendance class group filter
    const attendanceClassGroupFilter = document.getElementById('class-group-filter-attendance');
    if (attendanceClassGroupFilter) {
        attendanceClassGroupFilter.addEventListener('change', function() {
            const period = document.getElementById('attendance-period').value;
            if (period) {
                loadStudentsForAttendance(period);
            }
        });
    }
    
    // Attendance period select
    const attendancePeriod = document.getElementById('attendance-period');
    if (attendancePeriod) {
        attendancePeriod.addEventListener('change', function() {
            if (this.value) {
                loadStudentsForAttendance(this.value);
            }
        });
    }
    
    // Default credits for work experience
    const defaultWorkCredits = document.getElementById('default-work-credits');
    if (defaultWorkCredits) {
        defaultWorkCredits.addEventListener('change', function() {
            applyDefaultCredits('work-experience-students-body', 'work-credits', this.value);
        });
    }
    
    // Default credits for attendance
    const defaultAttendanceCredits = document.getElementById('default-attendance-credits');
    if (defaultAttendanceCredits) {
        defaultAttendanceCredits.addEventListener('change', function() {
            applyDefaultCredits('attendance-students-body', 'attendance-credits', this.value);
        });
    }
}

// Apply default credits to all selected students
function applyDefaultCredits(tableBodyId, creditFieldPrefix, defaultValue) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    
    const checkedStudents = tableBody.querySelectorAll('input[type="checkbox"]:checked');
    
    checkedStudents.forEach(checkbox => {
        const studentId = checkbox.id.split('-').pop();
        const creditField = document.getElementById(`${creditFieldPrefix}-${studentId}`);
        
        if (creditField) {
            creditField.value = defaultValue;
        }
    });
}

// Update class group filter based on selected academic year
function updateClassGroupsForAcademicYear(academicYearId, classGroupFilterId) {
    const classGroupFilter = document.getElementById(classGroupFilterId);
    if (!classGroupFilter) return;
    
    // Save the current selection if any
    const currentSelection = classGroupFilter.value;
    
    // Clear existing options (except for "All Class Groups")
    const firstOption = classGroupFilter.options[0];
    classGroupFilter.innerHTML = '';
    classGroupFilter.appendChild(firstOption);
    
    // If no academic year selected, use all class groups
    if (!academicYearId) {
        window.dummyData.classGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            classGroupFilter.appendChild(option);
        });
    } else {
        // Filter class groups by academic year
        const filteredGroups = window.dummyData.classGroups.filter(
            group => group.academic_year_id == academicYearId
        );
        
        filteredGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            classGroupFilter.appendChild(option);
        });
    }
    
    // Try to restore previous selection if it still exists
    if (currentSelection) {
        for (let i = 0; i < classGroupFilter.options.length; i++) {
            if (classGroupFilter.options[i].value === currentSelection) {
                classGroupFilter.value = currentSelection;
                break;
            }
        }
    }
}

// Load students for work experience
function loadStudentsForWorkExperience(classGroupId, selectAll = false) {
    const tableBody = document.getElementById('work-experience-students-body');
    if (!tableBody) return;
    
    // Get all students
    let students = [...window.dummyData.students];
    
    // Filter by class group if selected
    if (classGroupId) {
        students = students.filter(student => student.class_group_id == classGroupId);
    }
    
    // Sort students by name
    students.sort((a, b) => a.name.localeCompare(b.name));
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no students found
    if (students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No students found matching filters
                </td>
            </tr>
        `;
        return;
    }
    
    // Get default credits
    const defaultCredits = document.getElementById('default-work-credits').value || 15;
    
    // Create table rows for each student
    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Find class group
        const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
        const classGroupName = classGroup ? classGroup.name : 'Not Assigned';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="checkbox" 
                    id="work-student-${student.id}" 
                    name="work-student-${student.id}" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded student-checkbox"
                    ${selectAll ? 'checked' : ''}
                >
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${student.name}</div>
                <div class="text-sm text-gray-500">${student.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${classGroupName}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="number" 
                    id="work-credits-${student.id}" 
                    name="work-credits-${student.id}" 
                    min="0" 
                    max="100" 
                    value="${defaultCredits}"
                    class="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Update "select all" checkbox
    const selectAllCheckbox = document.getElementById('select-all-work');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectAll;
    }
}// assign-credits.js - Credit assignment functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the assign credits page
    initAssignCredits();
});

// Initialize the assign credits page
function initAssignCredits() {
    // Set up credit type buttons
    setupCreditTypeButtons();
    
    // Populate academic year filters
    populateAcademicYearFilters();
    
    // Populate class group filters
    populateClassGroupFilters();
    
    // Set up form submissions
    setupFormSubmissions();
    
    // Set up "select all" checkboxes
    setupSelectAllCheckboxes();
    
    // Add event listeners for filters
    setupFilterListeners();
    
    // Set up bulk select buttons
    setupBulkSelectButtons();
}

// Set up the credit type buttons
function setupCreditTypeButtons() {
    const creditTypeBtns = [
        document.getElementById('btn-subject-credits'),
        document.getElementById('btn-work-experience'),
        document.getElementById('btn-portfolio'),
        document.getElementById('btn-attendance')
    ];
    
    const formContainers = [
        document.getElementById('subject-credits-form'),
        document.getElementById('work-experience-form'),
        document.getElementById('portfolio-form'),
        document.getElementById('attendance-form')
    ];
    
    const defaultContent = document.getElementById('default-content');
    
    // Add click event listeners to each button
    creditTypeBtns.forEach((btn, index) => {
        if (!btn) return;
        
        btn.addEventListener('click', () => {
            // Hide all forms
            formContainers.forEach(container => {
                if (container) container.classList.add('hidden');
            });
            
            // Hide default content
            if (defaultContent) defaultContent.classList.add('hidden');
            
            // Show selected form
            if (formContainers[index]) formContainers[index].classList.remove('hidden');
        });
    });
}

// Populate academic year filters
function populateAcademicYearFilters() {
    const academicYearFilters = [
        document.getElementById('academic-year-filter-attendance')
    ];
    
    academicYearFilters.forEach(filter => {
        if (!filter) return;
        
        // Clear existing options (except for the first one)
        const firstOption = filter.options[0];
        filter.innerHTML = '';
        filter.appendChild(firstOption);
        
        // Add academic years from dummy data
        window.dummyData.academicYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year.id;
            option.textContent = year.name;
            filter.appendChild(option);
        });
    });
}

// Populate class group filters
function populateClassGroupFilters() {
    const classGroupFilters = [
        document.getElementById('class-group-filter'),
        document.getElementById('class-group-filter-portfolio'),
        document.getElementById('class-group-filter-attendance'),
        document.getElementById('class-group-filter-work')
    ];
    
    classGroupFilters.forEach(filter => {
        if (!filter) return;
        
        // Clear existing options (except for "All Class Groups")
        const firstOption = filter.options[0];
        filter.innerHTML = '';
        filter.appendChild(firstOption);
        
        // Add class groups from dummy data
        window.dummyData.classGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            filter.appendChild(option);
        });
    });
}

// Set up bulk select buttons
function setupBulkSelectButtons() {
    // Work Experience bulk select
    const bulkSelectWorkBtn = document.getElementById('bulk-select-work');
    if (bulkSelectWorkBtn) {
        bulkSelectWorkBtn.addEventListener('click', function() {
            const classGroupId = document.getElementById('class-group-filter-work').value;
            loadStudentsForWorkExperience(classGroupId, true);
        });
    }
    
    // Attendance bulk select
    const bulkSelectAttendanceBtn = document.getElementById('bulk-select-attendance');
    if (bulkSelectAttendanceBtn) {
        bulkSelectAttendanceBtn.addEventListener('click', function() {
            const academicYearId = document.getElementById('academic-year-filter-attendance').value;
            const classGroupId = document.getElementById('class-group-filter-attendance').value;
            const period = document.getElementById('attendance-period').value;
            
            if (!period) {
                window.helpers.showToast('Please select a period first', 'warning');
                return;
            }
            
            loadStudentsForAttendance(period, true, academicYearId);
        });
    }
}

// Populate student select for work experience
function populateStudentSelect() {
    const studentSelect = document.getElementById('student-select-work');
    if (!studentSelect) return;
    
    // Clear existing options (except for "Select Student")
    const firstOption = studentSelect.options[0];
    studentSelect.innerHTML = '';
    studentSelect.appendChild(firstOption);
    
    // Sort students by name
    const sortedStudents = [...window.dummyData.students].sort((a, b) => 
        a.name.localeCompare(b.name)
    );
    
    // Add students from dummy data
    sortedStudents.forEach(student => {
        // Get class group
        const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
        const classGroupName = classGroup ? classGroup.name : 'No Class';
        
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (${classGroupName})`;
        studentSelect.appendChild(option);
    });
}

// Populate subjects select
function populateSubjectsSelect() {
    const subjectSelect = document.getElementById('subject-select');
    if (!subjectSelect) return;
    
    // Clear existing options (except for "Select Subject")
    const firstOption = subjectSelect.options[0];
    subjectSelect.innerHTML = '';
    subjectSelect.appendChild(firstOption);
    
    // Group subjects by type
    const subjectTypes = {
        core: [],
        optional: [],
        short: [],
        other: []
    };
    
    // Filter subjects for current academic year (would be dynamic in production)
    // For now, just use the first academic year
    const currentAcademicYearId = window.dummyData.academicYears[0].id;
    const academicYearSubjects = window.dummyData.subjects.filter(
        subject => subject.academic_year_id === currentAcademicYearId
    );
    
    // Group subjects by type
    academicYearSubjects.forEach(subject => {
        if (subjectTypes[subject.type]) {
            subjectTypes[subject.type].push(subject);
        }
    });
    
    // Add optgroups for each subject type
    const typeLabels = {
        core: 'Core Subjects',
        optional: 'Optional Subjects',
        short: 'Short Subjects',
        other: 'Other Credits'
    };
    
    Object.keys(subjectTypes).forEach(type => {
        if (subjectTypes[type].length === 0) return;
        
        const optgroup = document.createElement('optgroup');
        optgroup.label = typeLabels[type];
        
        // Sort subjects by name
        subjectTypes[type].sort((a, b) => a.name.localeCompare(b.name));
        
        // Add subjects to optgroup
        subjectTypes[type].forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            option.dataset.creditValue = subject.credit_value;
            optgroup.appendChild(option);
        });
        
        subjectSelect.appendChild(optgroup);
    });
    
    // Add change event listener to update max credits
    subjectSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const maxCredits = selectedOption.dataset.creditValue || 0;
        
        document.getElementById('max-credits').textContent = maxCredits;
        
        // Load students for the selected subject
        loadStudentsForSubject(this.value);
    });
}

// Set up form submissions
function setupFormSubmissions() {
    // Subject credit form
    const subjectCreditForm = document.getElementById('subject-credit-form');
    if (subjectCreditForm) {
        subjectCreditForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSubjectCredits();
        });
    }
    
    // Work experience form
    const workExperienceForm = document.getElementById('work-experience-form');
    if (workExperienceForm) {
        workExperienceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveWorkExperience();
        });
    }
    
    // Portfolio credit form
    const portfolioCreditForm = document.getElementById('portfolio-credit-form');
    if (portfolioCreditForm) {
        portfolioCreditForm.addEventListener('submit', function(e) {
            e.preventDefault();
            savePortfolioCredits();
        });
    }
    
    // Attendance credit form
    const attendanceCreditForm = document.getElementById('attendance-credit-form');
    if (attendanceCreditForm) {
        attendanceCreditForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAttendanceCredits();
        });
    }
}

// Set up "select all" checkboxes
function setupSelectAllCheckboxes() {
    const selectAllCheckboxes = [
        { id: 'select-all-students', tableBodyId: 'students-table-body' },
        { id: 'select-all-portfolio', tableBodyId: 'portfolio-students-body' },
        { id: 'select-all-attendance', tableBodyId: 'attendance-students-body' },
        { id: 'select-all-work', tableBodyId: 'work-experience-students-body' }
    ];
    
    selectAllCheckboxes.forEach(({ id, tableBodyId }) => {
        const selectAllCheckbox = document.getElementById(id);
        const tableBody = document.getElementById(tableBodyId);
        
        if (!selectAllCheckbox || !tableBody) return;
        
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = tableBody.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    });
}

// Set up filter listeners
function setupFilterListeners() {
    // Subject class group filter
    const classGroupFilter = document.getElementById('class-group-filter');
    if (classGroupFilter) {
        classGroupFilter.addEventListener('change', function() {
            const subjectId = document.getElementById('subject-select').value;
            if (subjectId) {
                loadStudentsForSubject(subjectId);
            }
        });
    }
    
    // Portfolio class group filter
    const portfolioClassGroupFilter = document.getElementById('class-group-filter-portfolio');
    if (portfolioClassGroupFilter) {
        portfolioClassGroupFilter.addEventListener('change', function() {
            const period = document.getElementById('portfolio-period').value;
            if (period) {
                loadStudentsForPortfolio(period);
            }
        });
    }
    
    // Portfolio period select
    const portfolioPeriod = document.getElementById('portfolio-period');
    if (portfolioPeriod) {
        portfolioPeriod.addEventListener('change', function() {
            if (this.value) {
                loadStudentsForPortfolio(this.value);
            }
        });
    }
    
    // Attendance class group filter
    const attendanceClassGroupFilter = document.getElementById('class-group-filter-attendance');
    if (attendanceClassGroupFilter) {
        attendanceClassGroupFilter.addEventListener('change', function() {
            const period = document.getElementById('attendance-period').value;
            if (period) {
                loadStudentsForAttendance(period);
            }
        });
    }
    
    // Attendance period select
    const attendancePeriod = document.getElementById('attendance-period');
    if (attendancePeriod) {
        attendancePeriod.addEventListener('change', function() {
            if (this.value) {
                loadStudentsForAttendance(this.value);
            }
        });
    }
}

// Load students for the selected subject
function loadStudentsForSubject(subjectId) {
    if (!subjectId) return;
    
    const tableBody = document.getElementById('students-table-body');
    if (!tableBody) return;
    
    // Get the selected subject
    const subject = window.dummyData.subjects.find(s => s.id == subjectId);
    if (!subject) return;
    
    // Get the selected class group filter
    const classGroupId = document.getElementById('class-group-filter').value;
    
    // Get all students
    let students = [...window.dummyData.students];
    
    // Filter by class group if selected
    if (classGroupId) {
        students = students.filter(student => student.class_group_id == classGroupId);
    }
    
    // Sort students by name
    students.sort((a, b) => a.name.localeCompare(b.name));
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no students found
    if (students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No students found matching filters
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each student
    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Find class group
        const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
        const classGroupName = classGroup ? classGroup.name : 'Not Assigned';
        
        // Check if student already has credits for this subject
        const enrollment = window.dummyData.enrollments.find(e => 
            e.student_id === student.id && e.subject_id == subjectId
        );
        const currentCredits = enrollment ? enrollment.credits_earned : 0;
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="checkbox" 
                    id="student-${student.id}" 
                    name="student-${student.id}" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded student-checkbox"
                    ${enrollment ? 'checked' : ''}
                >
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${student.name}</div>
                <div class="text-sm text-gray-500">${student.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${classGroupName}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="number" 
                    id="credits-${student.id}" 
                    name="credits-${student.id}" 
                    min="0" 
                    max="${subject.credit_value}" 
                    value="${currentCredits}"
                    class="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Load students for portfolio credits
function loadStudentsForPortfolio(period) {
    if (!period) return;
    
    const tableBody = document.getElementById('portfolio-students-body');
    if (!tableBody) return;
    
    // Get the selected class group filter
    const classGroupId = document.getElementById('class-group-filter-portfolio').value;
    
    // Get all students
    let students = [...window.dummyData.students];
    
    // Filter by class group if selected
    if (classGroupId) {
        students = students.filter(student => student.class_group_id == classGroupId);
    }
    
    // Sort students by name
    students.sort((a, b) => a.name.localeCompare(b.name));
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no students found
    if (students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No students found matching filters
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each student
    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Find class group
        const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
        const classGroupName = classGroup ? classGroup.name : 'Not Assigned';
        
        // Check if student already has portfolio credits for this period
        const portfolio = window.dummyData.portfolios.find(p => 
            p.student_id === student.id && p.period === period
        );
        const currentCredits = portfolio ? portfolio.credits_earned : 0;
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="checkbox" 
                    id="portfolio-student-${student.id}" 
                    name="portfolio-student-${student.id}" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded student-checkbox"
                    ${portfolio ? 'checked' : ''}
                >
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${student.name}</div>
                <div class="text-sm text-gray-500">${student.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${classGroupName}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="number" 
                    id="portfolio-credits-${student.id}" 
                    name="portfolio-credits-${student.id}" 
                    min="0" 
                    max="100" 
                    value="${currentCredits}"
                    class="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Load students for attendance credits
function loadStudentsForAttendance(period, selectAll = false, academicYearId = null) {
    if (!period) return;
    
    const tableBody = document.getElementById('attendance-students-body');
    if (!tableBody) return;
    
    // Get the selected filters
    const selectedAcademicYearId = academicYearId || document.getElementById('academic-year-filter-attendance').value;
    const classGroupId = document.getElementById('class-group-filter-attendance').value;
    
    // Get all students
    let students = [...window.dummyData.students];
    
    // Filter by academic year if selected
    if (selectedAcademicYearId) {
        // Get class groups for this academic year
        const academicYearClassGroups = window.dummyData.classGroups.filter(
            cg => cg.academic_year_id == selectedAcademicYearId
        ).map(cg => cg.id);
        
        // Filter students by these class groups
        students = students.filter(student => academicYearClassGroups.includes(student.class_group_id));
    }
    
    // Further filter by class group if selected
    if (classGroupId) {
        students = students.filter(student => student.class_group_id == classGroupId);
    }
    
    // Sort students by name
    students.sort((a, b) => a.name.localeCompare(b.name));
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no students found
    if (students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No students found matching filters
                </td>
            </tr>
        `;
        return;
    }
    
    // Get default credits
    const defaultCredits = document.getElementById('default-attendance-credits').value || 5;
    
    // Create table rows for each student
    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Find class group
        const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
        const classGroupName = classGroup ? classGroup.name : 'Not Assigned';
        
        // Check if student already has attendance credits for this period
        const attendance = window.dummyData.attendance.find(a => 
            a.student_id === student.id && a.period === period
        );
        const currentCredits = attendance ? attendance.credits_earned : defaultCredits;
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="checkbox" 
                    id="attendance-student-${student.id}" 
                    name="attendance-student-${student.id}" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded student-checkbox"
                    ${attendance || selectAll ? 'checked' : ''}
                >
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${student.name}</div>
                <div class="text-sm text-gray-500">${student.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${classGroupName}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input 
                    type="number" 
                    id="attendance-credits-${student.id}" 
                    name="attendance-credits-${student.id}" 
                    min="0" 
                    max="10" 
                    value="${currentCredits}"
                    class="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Update "select all" checkbox
    const selectAllCheckbox = document.getElementById('select-all-attendance');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectAll;
    }
}

// Save subject credits
function saveSubjectCredits() {
    const subjectId = document.getElementById('subject-select').value;
    if (!subjectId) {
        window.helpers.showToast('Please select a subject', 'error');
        return;
    }
    
    // Get all checked student checkboxes
    const checkedStudents = document.querySelectorAll('#students-table-body input[type="checkbox"]:checked');
    if (checkedStudents.length === 0) {
        window.helpers.showToast('Please select at least one student', 'error');
        return;
    }
    
    // Collect credits for each student
    const studentCredits = [];
    
    checkedStudents.forEach(checkbox => {
        const studentId = checkbox.id.replace('student-', '');
        const creditsInput = document.getElementById(`credits-${studentId}`);
        
        if (creditsInput) {
            studentCredits.push({
                student_id: parseInt(studentId),
                subject_id: parseInt(subjectId),
                credits_earned: parseInt(creditsInput.value) || 0
            });
        }
    });
    
    // In production, this would call the API to save credits
    // For the prototype, we'll update the dummy data
    
    // For each student, update or create enrollment
    studentCredits.forEach(credit => {
        // Check if enrollment already exists
        const enrollmentIndex = window.dummyData.enrollments.findIndex(e => 
            e.student_id === credit.student_id && e.subject_id === credit.subject_id
        );
        
        if (enrollmentIndex >= 0) {
            // Update existing enrollment
            window.dummyData.enrollments[enrollmentIndex].credits_earned = credit.credits_earned;
        } else {
            // Create new enrollment
            window.dummyData.enrollments.push({
                id: window.dummyData.enrollments.length + 1,
                student_id: credit.student_id,
                subject_id: credit.subject_id,
                credits_earned: credit.credits_earned
            });
        }
    });
    
    // Show success message
    window.helpers.showToast(`Credits saved for ${studentCredits.length} students`, 'success');
}

// Save work experience
function saveWorkExperience() {
    const business = document.getElementById('business-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    // Basic validation
    if (!startDate || !endDate) {
        window.helpers.showToast('Please fill in the required date fields', 'error');
        return;
    }
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
        window.helpers.showToast('Start date must be before end date', 'error');
        return;
    }
    
    // Get all checked student checkboxes
    const checkedStudents = document.querySelectorAll('#work-experience-students-body input[type="checkbox"]:checked');
    if (checkedStudents.length === 0) {
        window.helpers.showToast('Please select at least one student', 'error');
        return;
    }
    
    // Collect work experience data for each student
    const studentWorkExperiences = [];
    
    checkedStudents.forEach(checkbox => {
        const studentId = checkbox.id.replace('work-student-', '');
        const creditsInput = document.getElementById(`work-credits-${studentId}`);
        
        if (creditsInput) {
            studentWorkExperiences.push({
                id: window.dummyData.workExperience.length + studentWorkExperiences.length + 1,
                student_id: parseInt(studentId),
                business,
                start_date: startDate,
                end_date: endDate,
                credits_earned: parseInt(creditsInput.value) || 0
            });
        }
    });
    
    // In production, this would call the API to save work experiences
    // For the prototype, we'll update the dummy data
    studentWorkExperiences.forEach(workExp => {
        window.dummyData.workExperience.push(workExp);
    });
    
    // Show success message
    window.helpers.showToast(`Work experience saved for ${studentWorkExperiences.length} students`, 'success');
    
    // Reset form
    document.getElementById('business-name').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    
    // Clear student selection
    const tableBody = document.getElementById('work-experience-students-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    Select a class group to see students
                </td>
            </tr>
        `;
    }
    
    // Reset "select all" checkbox
    const selectAllCheckbox = document.getElementById('select-all-work');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
}

// Save portfolio credits
function savePortfolioCredits() {
    const period = document.getElementById('portfolio-period').value;
    if (!period) {
        window.helpers.showToast('Please select a period', 'error');
        return;
    }
    
    // Get all checked student checkboxes
    const checkedStudents = document.querySelectorAll('#portfolio-students-body input[type="checkbox"]:checked');
    if (checkedStudents.length === 0) {
        window.helpers.showToast('Please select at least one student', 'error');
        return;
    }
    
    // Collect credits for each student
    const studentCredits = [];
    
    checkedStudents.forEach(checkbox => {
        const studentId = checkbox.id.replace('portfolio-student-', '');
        const creditsInput = document.getElementById(`portfolio-credits-${studentId}`);
        
        if (creditsInput) {
            studentCredits.push({
                student_id: parseInt(studentId),
                period,
                credits_earned: parseInt(creditsInput.value) || 0
            });
        }
    });
    
    // In production, this would call the API to save credits
    // For the prototype, we'll update the dummy data
    
    // For each student, update or create portfolio entry
    studentCredits.forEach(credit => {
        // Check if portfolio entry already exists
        const portfolioIndex = window.dummyData.portfolios.findIndex(p => 
            p.student_id === credit.student_id && p.period === credit.period
        );
        
        if (portfolioIndex >= 0) {
            // Update existing portfolio entry
            window.dummyData.portfolios[portfolioIndex].credits_earned = credit.credits_earned;
        } else {
            // Create new portfolio entry
            window.dummyData.portfolios.push({
                id: window.dummyData.portfolios.length + 1,
                student_id: credit.student_id,
                period: credit.period,
                credits_earned: credit.credits_earned
            });
        }
    });
    
    // Show success message
    window.helpers.showToast(`Portfolio credits saved for ${studentCredits.length} students`, 'success');
}

// Save attendance credits
function saveAttendanceCredits() {
    const period = document.getElementById('attendance-period').value;
    if (!period) {
        window.helpers.showToast('Please select a period', 'error');
        return;
    }
    
    // Get all checked student checkboxes
    const checkedStudents = document.querySelectorAll('#attendance-students-body input[type="checkbox"]:checked');
    if (checkedStudents.length === 0) {
        window.helpers.showToast('Please select at least one student', 'error');
        return;
    }
    
    // Collect credits for each student
    const studentCredits = [];
    
    checkedStudents.forEach(checkbox => {
        const studentId = checkbox.id.replace('attendance-student-', '');
        const creditsInput = document.getElementById(`attendance-credits-${studentId}`);
        
        if (creditsInput) {
            studentCredits.push({
                student_id: parseInt(studentId),
                period,
                credits_earned: parseInt(creditsInput.value) || 0
            });
        }
    });
    
    // In production, this would call the API to save credits
    // For the prototype, we'll update the dummy data
    
    // For each student, update or create attendance entry
    studentCredits.forEach(credit => {
        // Check if attendance entry already exists
        const attendanceIndex = window.dummyData.attendance.findIndex(a => 
            a.student_id === credit.student_id && a.period === credit.period
        );
        
        if (attendanceIndex >= 0) {
            // Update existing attendance entry
            window.dummyData.attendance[attendanceIndex].credits_earned = credit.credits_earned;
        } else {
            // Create new attendance entry
            window.dummyData.attendance.push({
                id: window.dummyData.attendance.length + 1,
                student_id: credit.student_id,
                period: credit.period,
                credits_earned: credit.credits_earned
            });
        }
    });
    
    // Show success message
    window.helpers.showToast(`Attendance credits saved for ${studentCredits.length} students`, 'success');
}
