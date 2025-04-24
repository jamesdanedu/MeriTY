// core-enrollment.js - Handle core subject enrollments

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the core enrollment page
    initCoreEnrollment();
});

// State variables
let selectedAcademicYearId = null;
let selectedClassGroupId = null;
let selectedSubjects = [];
let studentsInGroup = [];

// Initialize the core enrollment page
function initCoreEnrollment() {
    // Populate academic year dropdown
    populateAcademicYears();
    
    // Set up event listeners
    setupEventListeners();
}

// Populate academic year dropdown
function populateAcademicYears() {
    const academicYearSelect = document.getElementById('academic-year');
    if (!academicYearSelect) return;
    
    // Clear existing options (except for the first one)
    const firstOption = academicYearSelect.options[0];
    academicYearSelect.innerHTML = '';
    academicYearSelect.appendChild(firstOption);
    
    // Add academic years from dummy data
    window.dummyData.academicYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.id;
        option.textContent = year.name;
        academicYearSelect.appendChild(option);
    });
    
    // Default to the first academic year
    if (window.dummyData.academicYears.length > 0) {
        academicYearSelect.value = window.dummyData.academicYears[0].id;
        // Trigger the change event
        const event = new Event('change');
        academicYearSelect.dispatchEvent(event);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Academic year change
    const academicYearSelect = document.getElementById('academic-year');
    if (academicYearSelect) {
        academicYearSelect.addEventListener('change', function() {
            selectedAcademicYearId = parseInt(this.value);
            populateClassGroups(selectedAcademicYearId);
        });
    }
    
    // Class group change
    const classGroupSelect = document.getElementById('class-group');
    if (classGroupSelect) {
        classGroupSelect.addEventListener('change', function() {
            selectedClassGroupId = parseInt(this.value);
            if (selectedClassGroupId && selectedAcademicYearId) {
                populateCoreSubjects(selectedAcademicYearId);
                studentsInGroup = getStudentsInGroup(selectedClassGroupId);
            }
        });
    }
    
    // Select all subjects button
    const selectAllSubjectsBtn = document.getElementById('select-all-subjects');
    if (selectAllSubjectsBtn) {
        selectAllSubjectsBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#core-subjects-container input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }
    
    // Form submission
    const coreEnrollmentForm = document.getElementById('core-enrollment-form');
    if (coreEnrollmentForm) {
        coreEnrollmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processSubjectSelection();
        });
    }
    
    // Back to selection button
    const backToSelectionBtn = document.getElementById('back-to-selection');
    if (backToSelectionBtn) {
        backToSelectionBtn.addEventListener('click', function() {
            document.getElementById('enrollment-preview').classList.add('hidden');
            document.getElementById('core-enrollment-form').parentElement.classList.remove('hidden');
        });
    }
    
    // Filter by subject dropdown
    const filterSubjectSelect = document.getElementById('filter-subject');
    if (filterSubjectSelect) {
        filterSubjectSelect.addEventListener('change', function() {
            const subjectId = this.value;
            
            // If "All Subjects" is selected, show all columns
            if (!subjectId) {
                document.querySelectorAll('th[data-subject-id], td[data-subject-id]').forEach(cell => {
                    cell.classList.remove('hidden');
                });
                return;
            }
            
            // Otherwise, hide all subject columns except the selected one
            document.querySelectorAll('th[data-subject-id], td[data-subject-id]').forEach(cell => {
                if (cell.dataset.subjectId === subjectId) {
                    cell.classList.remove('hidden');
                } else {
                    cell.classList.add('hidden');
                }
            });
        });
    }
    
    // Confirm enrollments button
    const confirmEnrollmentsBtn = document.getElementById('confirm-enrollments');
    if (confirmEnrollmentsBtn) {
        confirmEnrollmentsBtn.addEventListener('click', function() {
            saveEnrollments();
        });
    }
    
    // Enroll another button
    const enrollAnotherBtn = document.getElementById('enroll-another');
    if (enrollAnotherBtn) {
        enrollAnotherBtn.addEventListener('click', function() {
            // Reset UI state
            document.getElementById('enrollment-success').classList.add('hidden');
            document.getElementById('core-enrollment-form').parentElement.classList.remove('hidden');
            
            // Reset form
            document.getElementById('core-enrollment-form').reset();
            
            // Reset state variables
            selectedSubjects = [];
            
            // Repopulate dropdowns
            populateAcademicYears();
        });
    }
}

// Populate class groups based on academic year
function populateClassGroups(academicYearId) {
    const classGroupSelect = document.getElementById('class-group');
    if (!classGroupSelect) return;
    
    // Clear existing options (except for the first one)
    const firstOption = classGroupSelect.options[0];
    classGroupSelect.innerHTML = '';
    classGroupSelect.appendChild(firstOption);
    
    // Filter class groups by academic year
    const filteredClassGroups = window.dummyData.classGroups.filter(
       // group => group.academic_year_id === academicYearId
       group => Number(group.academic_year_id) === Number(academicYearId)
    );
    
    // Add class groups to the dropdown
    filteredClassGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        classGroupSelect.appendChild(option);
    });
}

// Populate core subjects based on academic year
function populateCoreSubjects(academicYearId) {
    const subjectsContainer = document.getElementById('core-subjects-container');
    if (!subjectsContainer) return;
    
    // Clear existing content
    subjectsContainer.innerHTML = '';
    
    // Filter subjects for the selected academic year
    // For core enrollment, we include core, short, and other subjects (everything except 'optional')
    const filteredSubjects = window.dummyData.subjects.filter(
        subject => subject.academic_year_id === academicYearId && subject.type !== 'optional'
    );
    
    if (filteredSubjects.length === 0) {
        subjectsContainer.innerHTML = `
            <p class="text-gray-500 text-center py-4">No core subjects found for this academic year.</p>
        `;
        return;
    }
    
    // Group subjects by type for better organization
    const groupedSubjects = {
        core: filteredSubjects.filter(s => s.type === 'core'),
        short: filteredSubjects.filter(s => s.type === 'short'),
        other: filteredSubjects.filter(s => s.type === 'other')
    };
    
    // Create subject checkboxes grouped by type
    Object.keys(groupedSubjects).forEach(type => {
        const subjects = groupedSubjects[type];
        if (subjects.length === 0) return;
        
        // Create type header
        const typeHeader = document.createElement('h4');
        typeHeader.className = 'text-sm font-medium text-gray-700 mt-4 mb-2';
        typeHeader.textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' Subjects';
        subjectsContainer.appendChild(typeHeader);
        
        // Create subject checkboxes
        subjects.forEach(subject => {
            const div = document.createElement('div');
            div.className = 'flex items-center mb-2';
            
            div.innerHTML = `
                <input 
                    type="checkbox" 
                    id="subject-${subject.id}" 
                    value="${subject.id}" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label for="subject-${subject.id}" class="ml-2 block text-sm text-gray-900">
                    ${subject.name} (${subject.credit_value} credits)
                </label>
            `;
            
            subjectsContainer.appendChild(div);
        });
    });
}

// Get students in a class group
function getStudentsInGroup(classGroupId) {
    return window.dummyData.students.filter(
        student => student.class_group_id === classGroupId
    );
}

// Process the subject selection and show the exemptions UI
function processSubjectSelection() {
    // Collect selected subjects
    selectedSubjects = [];
    const subjectCheckboxes = document.querySelectorAll('#core-subjects-container input[type="checkbox"]:checked');
    
    subjectCheckboxes.forEach(checkbox => {
        const subjectId = parseInt(checkbox.value);
        const subject = window.dummyData.subjects.find(s => s.id === subjectId);
        if (subject) {
            selectedSubjects.push(subject);
        }
    });
    
    // Validate that at least one subject is selected
    if (selectedSubjects.length === 0) {
        window.helpers.showToast('Please select at least one subject', 'error');
        return;
    }
    
    // Validate that we have a class group and students
    if (!selectedClassGroupId || studentsInGroup.length === 0) {
        window.helpers.showToast('Please select a class group with students', 'error');
        return;
    }
    
    // Update the summary information
    updateEnrollmentSummary();
    
    // Generate the exemptions table
    generateExemptionsTable();
    
    // Hide the form and show the preview
    document.getElementById('core-enrollment-form').parentElement.classList.add('hidden');
    document.getElementById('enrollment-preview').classList.remove('hidden');
}

// Update the enrollment summary
function updateEnrollmentSummary() {
    // Get the selected academic year and class group names
    const academicYear = window.dummyData.academicYears.find(
        year => year.id === selectedAcademicYearId
    );
    
    const classGroup = window.dummyData.classGroups.find(
        group => group.id === selectedClassGroupId
    );
    
    // Update the summary sections
    document.getElementById('summary-academic-year').textContent = academicYear ? academicYear.name : 'Unknown';
    document.getElementById('summary-class-group').textContent = classGroup ? classGroup.name : 'Unknown';
    document.getElementById('summary-subject-count').textContent = `${selectedSubjects.length} subject${selectedSubjects.length !== 1 ? 's' : ''}`;
    
    // Populate the filter by subject dropdown
    const filterSubjectSelect = document.getElementById('filter-subject');
    if (filterSubjectSelect) {
        // Clear existing options (except for the first one)
        const firstOption = filterSubjectSelect.options[0];
        filterSubjectSelect.innerHTML = '';
        filterSubjectSelect.appendChild(firstOption);
        
        // Add subjects to the dropdown
        selectedSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            filterSubjectSelect.appendChild(option);
        });
    }
}

// Generate the exemptions table
function generateExemptionsTable() {
    const table = document.getElementById('student-exemptions-table');
    if (!table) return;
    
    // Clear existing content
    table.innerHTML = '';
    
    // Update the table header to include subjects
    const headerRow = document.querySelector('#enrollment-preview table thead tr');
    if (headerRow) {
        // Clear existing subject columns
        const existingSubjectColumns = headerRow.querySelectorAll('th[data-subject-id]');
        existingSubjectColumns.forEach(column => column.remove());
        
        // Add a subject column for each selected subject
        selectedSubjects.forEach(subject => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider';
            th.setAttribute('data-subject-id', subject.id);
            th.textContent = subject.name;
            headerRow.appendChild(th);
        });
    }
    
    // Add a row for each student with checkboxes for each subject
    studentsInGroup.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Add student information
        const studentCell = document.createElement('td');
        studentCell.className = 'px-6 py-4 whitespace-nowrap';
        studentCell.innerHTML = `
            <div class="text-sm font-medium text-gray-900">${student.name}</div>
            <div class="text-sm text-gray-500">${student.email}</div>
        `;
        tr.appendChild(studentCell);
        
        // Add checkbox for each subject
        selectedSubjects.forEach(subject => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4 whitespace-nowrap text-center';
            td.setAttribute('data-subject-id', subject.id);
            
            // Check if student already enrolled in this subject
            const existingEnrollment = window.dummyData.enrollments.find(
                e => e.student_id === student.id && e.subject_id === subject.id
            );
            
            // Create the checkbox
            td.innerHTML = `
                <input 
                    type="checkbox" 
                    id="enrollment-${student.id}-${subject.id}" 
                    data-student-id="${student.id}" 
                    data-subject-id="${subject.id}" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    ${existingEnrollment ? 'checked' : ''}
                >
            `;
            
            tr.appendChild(td);
        });
        
        table.appendChild(tr);
    });
}

// Save enrollments
function saveEnrollments() {
    // Collect enrollments from the table
    const enrollments = [];
    const enrollmentCheckboxes = document.querySelectorAll('#student-exemptions-table input[type="checkbox"]');
    
    enrollmentCheckboxes.forEach(checkbox => {
        const studentId = parseInt(checkbox.dataset.studentId);
        const subjectId = parseInt(checkbox.dataset.subjectId);
        const isChecked = checkbox.checked;
        
        // Find the subject
        const subject = selectedSubjects.find(s => s.id === subjectId);
        if (!subject) return;
        
        // Find existing enrollment
        const existingEnrollmentIndex = window.dummyData.enrollments.findIndex(
            e => e.student_id === studentId && e.subject_id === subjectId
        );
        
        if (isChecked) {
            // If checked and enrollment doesn't exist, add it
            if (existingEnrollmentIndex === -1) {
                const newEnrollment = {
                    id: window.dummyData.enrollments.length + enrollments.length + 1,
                    student_id: studentId,
                    subject_id: subjectId,
                    credits_earned: 0 // Initial credits are zero
                };
                
                enrollments.push(newEnrollment);
            }
        } else {
            // If unchecked and enrollment exists, remove it
            if (existingEnrollmentIndex !== -1) {
                window.dummyData.enrollments.splice(existingEnrollmentIndex, 1);
            }
        }
    });
    
    // Add new enrollments to the dummy data
    if (enrollments.length > 0) {
        window.dummyData.enrollments.push(...enrollments);
    }
    
    // Show success message
    document.getElementById('enrollment-preview').classList.add('hidden');
    document.getElementById('enrollment-success').classList.remove('hidden');
}
