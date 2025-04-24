// optional-enrollment.js - Handle optional subject enrollments

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the optional enrollment page
    initOptionalEnrollment();
});

// State variables
let selectedAcademicYearId = null;
let selectedTerm = null;
let selectedSubjectId = null;
let allStudents = [];

// Initialize the optional enrollment page
function initOptionalEnrollment() {
    // Populate academic year dropdown
    populateAcademicYears();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load current enrollments
    loadCurrentEnrollments();
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
            populateOptionalSubjects(selectedAcademicYearId);
            populateClassGroupFilter(selectedAcademicYearId);
        });
    }
    
    // Term change
    const termSelect = document.getElementById('term');
    if (termSelect) {
        termSelect.addEventListener('change', function() {
            selectedTerm = this.value;
        });
    }
    
    // Optional subject change
    const subjectSelect = document.getElementById('optional-subject');
    if (subjectSelect) {
        subjectSelect.addEventListener('change', function() {
            selectedSubjectId = parseInt(this.value);
            if (selectedAcademicYearId && selectedSubjectId) {
                loadStudentsForEnrollment();
            }
        });
    }
    
    // Class group filter change
    const classGroupFilter = document.getElementById('filter-class-group');
    if (classGroupFilter) {
        classGroupFilter.addEventListener('change', function() {
            filterStudentsByClassGroup(this.value);
        });
    }
    
    // Select all students
    const selectAllStudentsBtn = document.getElementById('select-all-students');
    if (selectAllStudentsBtn) {
        selectAllStudentsBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#student-selection-container input[type="checkbox"]:not(:disabled)');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }
    
    // Deselect all students
    const deselectAllStudentsBtn = document.getElementById('deselect-all-students');
    if (deselectAllStudentsBtn) {
        deselectAllStudentsBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#student-selection-container input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
    
    // Form submission
    const optionalEnrollmentForm = document.getElementById('optional-enrollment-form');
    if (optionalEnrollmentForm) {
        optionalEnrollmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveOptionalEnrollments();
        });
    }
    
    // View enrollments filters
    const viewTermSelect = document.getElementById('view-term');
    const viewSubjectSelect = document.getElementById('view-subject');
    
    if (viewTermSelect) {
        viewTermSelect.addEventListener('change', function() {
            loadCurrentEnrollments();
        });
    }
    
    if (viewSubjectSelect) {
        viewSubjectSelect.addEventListener('change', function() {
            loadCurrentEnrollments();
        });
    }
}

// Populate optional subjects dropdown
function populateOptionalSubjects(academicYearId) {
    const subjectSelect = document.getElementById('optional-subject');
    if (!subjectSelect) return;
    
    // Clear existing options (except for the first one)
    const firstOption = subjectSelect.options[0];
    subjectSelect.innerHTML = '';
    subjectSelect.appendChild(firstOption);
    
    // Filter optional subjects for this academic year
    const optionalSubjects = window.dummyData.subjects.filter(
        subject => subject.academic_year_id === academicYearId && subject.type === 'optional'
    );
    
    // Add subjects to the dropdown
    optionalSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        subjectSelect.appendChild(option);
    });
    
    // Also populate the view subject filter
    const viewSubjectSelect = document.getElementById('view-subject');
    if (viewSubjectSelect) {
        // Clear existing options (except for the first one)
        const firstViewOption = viewSubjectSelect.options[0];
        viewSubjectSelect.innerHTML = '';
        viewSubjectSelect.appendChild(firstViewOption);
        
        // Add subjects to the dropdown
        optionalSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            viewSubjectSelect.appendChild(option);
        });
    }
}

// Populate class group filter
function populateClassGroupFilter(academicYearId) {
    const filterSelect = document.getElementById('filter-class-group');
    if (!filterSelect) return;
    
    // Clear existing options (except for the first one)
    const firstOption = filterSelect.options[0];
    filterSelect.innerHTML = '';
    filterSelect.appendChild(firstOption);
    
    // Filter class groups by academic year
    const classGroups = window.dummyData.classGroups.filter(
        group => group.academic_year_id === academicYearId
    );
    
    // Add class groups to the dropdown
    classGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        filterSelect.appendChild(option);
    });
}

// Load students for enrollment
function loadStudentsForEnrollment() {
    const container = document.getElementById('student-selection-container');
    if (!container) return;
    
    // Clear the container
    container.innerHTML = '';
    
    // Get all students (for this academic year)
    allStudents = window.dummyData.students;
    
    // Check if we have students
    if (allStudents.length === 0) {
        container.innerHTML = `
            <p class="text-gray-500 text-center py-4">No students found.</p>
        `;
        return;
    }
    
    // Group students by class group for better organization
    const studentsByClass = {};
    
    allStudents.forEach(student => {
        const classGroupId = student.class_group_id;
        if (!studentsByClass[classGroupId]) {
            studentsByClass[classGroupId] = [];
        }
        studentsByClass[classGroupId].push(student);
    });
    
    // For each class group, create a section
    Object.keys(studentsByClass).forEach(classGroupId => {
        if (!classGroupId) return; // Skip students without a class group
        
        const students = studentsByClass[classGroupId];
        const classGroup = window.dummyData.classGroups.find(g => g.id == classGroupId);
        
        const classHeader = document.createElement('div');
        classHeader.className = 'font-medium text-gray-700 my-2 pb-1 border-b';
        classHeader.textContent = classGroup ? classGroup.name : 'Unknown Class';
        classHeader.setAttribute('data-class-id', classGroupId);
        container.appendChild(classHeader);
        
        // Create a student list for this class
        const studentList = document.createElement('div');
        studentList.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4';
        studentList.setAttribute('data-class-id', classGroupId);
        
        // Add students to the list
        students.forEach(student => {
            // Check if student is already enrolled in another optional subject for this term
            const existingOptionalEnrollment = hasConflictingOptionalEnrollment(student.id, selectedTerm);
            
            const studentDiv = document.createElement('div');
            studentDiv.className = 'flex items-center';
            
            if (existingOptionalEnrollment) {
                studentDiv.classList.add('opacity-50');
            }
            
            // Check if already enrolled in this subject
            const currentEnrollment = isEnrolledInSubject(student.id, selectedSubjectId);
            
            studentDiv.innerHTML = `
                <input 
                    type="checkbox" 
                    id="student-${student.id}" 
                    value="${student.id}" 
                    data-class-id="${classGroupId}"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    ${currentEnrollment ? 'checked' : ''}
                    ${existingOptionalEnrollment && !currentEnrollment ? 'disabled title="Already enrolled in another optional subject"' : ''}
                >
                <label for="student-${student.id}" class="ml-2 block text-sm text-gray-900 ${existingOptionalEnrollment && !currentEnrollment ? 'line-through' : ''}">
                    ${student.name}
                    ${existingOptionalEnrollment && !currentEnrollment ? 
                        `<span class="text-xs text-yellow-600 ml-1">(Enrolled in ${existingOptionalEnrollment.subjectName})</span>` : ''}
                </label>
            `;
            
            studentList.appendChild(studentDiv);
        });
        
        container.appendChild(studentList);
    });
}

// Filter students by class group
function filterStudentsByClassGroup(classGroupId) {
    // If "All Classes" is selected, show all
    if (!classGroupId) {
        document.querySelectorAll('[data-class-id]').forEach(element => {
            element.classList.remove('hidden');
        });
        return;
    }
    
    // Otherwise, hide all except the selected class
    document.querySelectorAll('[data-class-id]').forEach(element => {
        if (element.getAttribute('data-class-id') === classGroupId) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}

// Check if a student is already enrolled in an optional subject for the selected term
function hasConflictingOptionalEnrollment(studentId, term) {
    // If no term is selected, assume no conflicts
    if (!term) return false;
    
    // Look for enrollments in optional subjects for this term
    const optionalSubjects = window.dummyData.subjects.filter(s => s.type === 'optional');
    const optionalSubjectIds = optionalSubjects.map(s => s.id);
    
    // Check for enrollments in any optional subject
    for (const subjectId of optionalSubjectIds) {
        if (subjectId === selectedSubjectId) continue; // Skip the current subject
        
        const enrollment = window.dummyData.enrollments.find(e => 
            e.student_id === studentId && 
            e.subject_id === subjectId &&
            e.term === term
        );
        
        if (enrollment) {
            const subject = optionalSubjects.find(s => s.id === subjectId);
            return {
                enrollmentId: enrollment.id,
                subjectId: subjectId,
                subjectName: subject ? subject.name : 'Unknown Subject'
            };
        }
    }
    
    return false;
}

// Check if a student is enrolled in a specific subject
function isEnrolledInSubject(studentId, subjectId) {
    return window.dummyData.enrollments.find(e => 
        e.student_id === studentId && 
        e.subject_id === subjectId
    );
}

// Save optional subject enrollments
function saveOptionalEnrollments() {
    // Validate form
    if (!selectedAcademicYearId || !selectedTerm || !selectedSubjectId) {
        window.helpers.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Get selected students
    const selectedStudentIds = [];
    const studentCheckboxes = document.querySelectorAll('#student-selection-container input[type="checkbox"]:checked:not(:disabled)');
    
    studentCheckboxes.forEach(checkbox => {
        selectedStudentIds.push(parseInt(checkbox.value));
    });
    
    if (selectedStudentIds.length === 0) {
        window.helpers.showToast('Please select at least one student', 'error');
        return;
    }
    
    // Process enrollments
    
    // First, get the existing enrollments for this subject
    const existingEnrollments = window.dummyData.enrollments.filter(e => 
        e.subject_id === selectedSubjectId
    );
    
    // Remove enrollments for students who are no longer selected
    existingEnrollments.forEach(enrollment => {
        if (!selectedStudentIds.includes(enrollment.student_id)) {
            // Remove this enrollment
            const index = window.dummyData.enrollments.findIndex(e => 
                e.student_id === enrollment.student_id && 
                e.subject_id === selectedSubjectId
            );
            
            if (index !== -1) {
                window.dummyData.enrollments.splice(index, 1);
            }
        }
    });
    
    // Add new enrollments for newly selected students
    selectedStudentIds.forEach(studentId => {
        const existing = existingEnrollments.find(e => e.student_id === studentId);
        
        if (!existing) {
            // Add new enrollment
            const newEnrollment = {
                id: window.dummyData.enrollments.length + 1,
                student_id: studentId,
                subject_id: selectedSubjectId,
                credits_earned: 0,
                term: selectedTerm
            };
            
            window.dummyData.enrollments.push(newEnrollment);
        } else {
            // Update the term if it changed
            const enrollmentIndex = window.dummyData.enrollments.findIndex(e => 
                e.student_id === studentId && 
                e.subject_id === selectedSubjectId
            );
            
            if (enrollmentIndex !== -1 && window.dummyData.enrollments[enrollmentIndex].term !== selectedTerm) {
                window.dummyData.enrollments[enrollmentIndex].term = selectedTerm;
            }
        }
    });
    
    // Show success message
    window.helpers.showToast(`${selectedStudentIds.length} students enrolled in ${getSubjectName(selectedSubjectId)}`, 'success');
    
    // Refresh the current enrollments list
    loadCurrentEnrollments();
    
    // Reset form
    document.getElementById('optional-enrollment-form').reset();
    document.getElementById('student-selection-container').innerHTML = '';
    
    // Reset state variables
    selectedSubjectId = null;
    selectedTerm = null;
}

// Get subject name from ID
function getSubjectName(subjectId) {
    const subject = window.dummyData.subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Unknown Subject';
}

// Load current optional subject enrollments
function loadCurrentEnrollments() {
    const tableBody = document.getElementById('current-enrollments-table');
    if (!tableBody) return;
    
    // Get filter values
    const termFilter = document.getElementById('view-term').value;
    const subjectFilter = parseInt(document.getElementById('view-subject').value);
    
    // Filter to optional subjects only
    const optionalSubjects = window.dummyData.subjects.filter(s => s.type === 'optional');
    const optionalSubjectIds = optionalSubjects.map(s => s.id);
    
    // Get enrollments for optional subjects
    let enrollments = window.dummyData.enrollments.filter(e => 
        optionalSubjectIds.includes(e.subject_id)
    );
    
    // Apply filters
    if (termFilter) {
        enrollments = enrollments.filter(e => e.term === termFilter);
    }
    
    if (subjectFilter) {
        enrollments = enrollments.filter(e => e.subject_id === subjectFilter);
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no enrollments
    if (enrollments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No optional subject enrollments found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort enrollments by subject then student
    enrollments.sort((a, b) => {
        // First sort by subject
        if (a.subject_id !== b.subject_id) {
            return a.subject_id - b.subject_id;
        }
        
        // Then by student
        const studentA = window.dummyData.students.find(s => s.id === a.student_id);
        const studentB = window.dummyData.students.find(s => s.id === b.student_id);
        
        if (studentA && studentB) {
            return studentA.name.localeCompare(studentB.name);
        }
        
        return 0;
    });
    
    // Add rows to the table
    enrollments.forEach((enrollment, index) => {
        const student = window.dummyData.students.find(s => s.id === enrollment.student_id);
        const subject = window.dummyData.subjects.find(s => s.id === enrollment.subject_id);
        const classGroup = student && student.class_group_id ? 
            window.dummyData.classGroups.find(c => c.id === student.class_group_id) : null;
            
        if (!student || !subject) return;
        
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${student.name}</div>
                <div class="text-sm text-gray-500">${student.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${classGroup ? classGroup.name : 'N/A'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${subject.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="${enrollment.term === 'Full Year' ? 'bg-purple-100 text-purple-800' : enrollment.term === 'Term 1' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} px-2 py-1 rounded-full text-xs font-medium">
                    ${enrollment.term || 'Unknown'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                    onclick="removeEnrollment(${enrollment.id})" 
                    class="text-red-600 hover:text-red-900"
                >
                    Remove
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Remove an enrollment
function removeEnrollment(enrollmentId) {
    // Get the enrollment
    const enrollmentIndex = window.dummyData.enrollments.findIndex(e => e.id === enrollmentId);
    
    if (enrollmentIndex === -1) {
        window.helpers.showToast('Enrollment not found', 'error');
        return;
    }
    
    const enrollment = window.dummyData.enrollments[enrollmentIndex];
    const student = window.dummyData.students.find(s => s.id === enrollment.student_id);
    const subject = window.dummyData.subjects.find(s => s.id === enrollment.subject_id);
    
    // Confirm removal
    window.helpers.showConfirmModal(
        'Remove Enrollment',
        `Are you sure you want to remove ${student ? student.name : 'Unknown Student'} from ${subject ? subject.name : 'Unknown Subject'}?`,
        () => {
            // Remove the enrollment
            window.dummyData.enrollments.splice(enrollmentIndex, 1);
            
            // Show success message
            window.helpers.showToast('Enrollment removed successfully', 'success');
            
            // Refresh the table
            loadCurrentEnrollments();
        }
    );
}

// Expose functions to global scope for HTML onclick handlers
window.removeEnrollment = removeEnrollment;