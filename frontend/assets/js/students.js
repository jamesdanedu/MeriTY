// students.js - Student management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page based on the current URL
    const path = window.location.pathname;
    
    if (path.endsWith('/index.html') || path.endsWith('/students/')) {
        initStudentList();
    } else if (path.includes('new.html')) {
        initStudentForm('new');
    } else if (path.includes('edit.html')) {
        initStudentForm('edit');
    } else if (path.includes('import.html')) {
        initStudentImport();
    }
});

// Initialize the student list page
function initStudentList() {
    // Populate class group filter
    populateClassGroupFilter();
    
    // Load students
    loadStudents();
    
    // Set up event listeners for filters
    document.getElementById('filter-class')?.addEventListener('change', loadStudents);
    document.getElementById('search-student')?.addEventListener('input', loadStudents);
}

// Populate the class group filter dropdown
function populateClassGroupFilter() {
    const filterSelect = document.getElementById('filter-class');
    if (!filterSelect) return;
    
    // Clear existing options (except for "All Class Groups")
    const firstOption = filterSelect.options[0];
    filterSelect.innerHTML = '';
    filterSelect.appendChild(firstOption);
    
    // Add class groups from dummy data
    window.dummyData.classGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        filterSelect.appendChild(option);
    });
}

// Load students with filters applied
function loadStudents() {
    const tableBody = document.getElementById('students-table-body');
    if (!tableBody) return;
    
    // Get filter values
    const classGroupFilter = document.getElementById('filter-class')?.value;
    const searchFilter = document.getElementById('search-student')?.value.toLowerCase();
    
    // Get URL parameters (for direct filtering)
    const params = window.helpers.getQueryParams();
    const urlClassGroupFilter = params.class_group_id;
    
    // Filter students
    let filteredStudents = [...window.dummyData.students];
    
    // Apply class group filter from URL or dropdown
    const effectiveClassGroupFilter = urlClassGroupFilter || classGroupFilter;
    if (effectiveClassGroupFilter) {
        filteredStudents = filteredStudents.filter(student => 
            student.class_group_id == effectiveClassGroupFilter
        );
        
        // If filtering from URL, update the dropdown
        if (urlClassGroupFilter && document.getElementById('filter-class')) {
            document.getElementById('filter-class').value = urlClassGroupFilter;
        }
    }
    
    // Apply search filter
    if (searchFilter) {
        filteredStudents = filteredStudents.filter(student =>
            student.name.toLowerCase().includes(searchFilter) ||
            student.email.toLowerCase().includes(searchFilter)
        );
    }
    
    // Update pagination info
    if (document.getElementById('pagination-info')) {
        document.getElementById('pagination-info').innerHTML = `
            Showing <span class="font-medium">1</span> to <span class="font-medium">${filteredStudents.length}</span> of <span class="font-medium">${filteredStudents.length}</span> results
        `;
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no students found
    if (filteredStudents.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No students found matching filters.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each student
    filteredStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Find class group
        const classGroup = window.dummyData.classGroups.find(cg => cg.id === student.class_group_id);
        const classGroupName = classGroup ? classGroup.name : 'Not Assigned';
        
        // Calculate total credits
        const totalCredits = window.helpers.getStudentTotalCredits(student.id);
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${student.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${student.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${classGroupName}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${totalCredits} credits</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="../credits/student-view.html?id=${student.id}" class="text-green-600 hover:text-green-900 mr-4">
                    <i class="fa-solid fa-graduation-cap mr-1"></i> Credits
                </a>
                <a href="edit.html?id=${student.id}" class="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                <button 
                    onclick="confirmDeleteStudent(${student.id}, '${student.name}')" 
                    class="text-red-600 hover:text-red-900"
                >
                    Delete
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Show confirmation modal for deleting a student
function confirmDeleteStudent(studentId, studentName) {
    // Check if student has credits associated
    const hasEnrollments = window.dummyData.enrollments.some(e => e.student_id === studentId);
    const hasWorkExperience = window.dummyData.workExperience.some(w => w.student_id === studentId);
    const hasPortfolio = window.dummyData.portfolios.some(p => p.student_id === studentId);
    
    let message = `Are you sure you want to delete ${studentName}? This action cannot be undone.`;
    
    if (hasEnrollments || hasWorkExperience || hasPortfolio) {
        message += `<br><br><strong class="text-red-600">Warning:</strong> This student has credits assigned. Deleting the student will remove all associated credit records.`;
    }
    
    window.helpers.showConfirmModal(
        'Delete Student',
        message,
        () => deleteStudent(studentId)
    );
}

// Delete a student
function deleteStudent(studentId) {
    // Call the API to delete the student
    window.api.request(`students/${studentId}`, 'DELETE')
        .then(response => {
            // Show success message
            window.helpers.showToast('Student deleted successfully', 'success');
            
            // Reload the student list
            loadStudents();
        })
        .catch(error => {
            console.error('Error deleting student:', error);
            window.helpers.showToast('Failed to delete student: ' + error.message, 'error');
        });
}

// Initialize the student form (new or edit)
function initStudentForm(mode) {
    // Populate class group select
    populateClassGroupSelect();
    
    // If in edit mode, load the student data
    if (mode === 'edit') {
        const params = window.helpers.getQueryParams();
        if (params.id) {
            loadStudentForEdit(params.id);
        } else {
            window.helpers.showToast('Student ID not provided', 'error');
            window.location.href = 'index.html';
        }
    }
    
    // Set up form submission
    const form = document.getElementById('student-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveStudent(mode);
        });
    }
}

// Populate the class group select dropdown
function populateClassGroupSelect() {
    const classGroupSelect = document.getElementById('class-group');
    if (!classGroupSelect) return;
    
    // Clear existing options (except for "Select Class Group")
    const firstOption = classGroupSelect.options[0];
    classGroupSelect.innerHTML = '';
    classGroupSelect.appendChild(firstOption);
    
    // Add class groups from dummy data
    window.dummyData.classGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        classGroupSelect.appendChild(option);
    });
}

// Load student data for editing
function loadStudentForEdit(studentId) {
    // Get student from API
    window.api.request(`students/${studentId}`, 'GET')
        .then(student => {
            // Populate form fields
            document.getElementById('student-name').value = student.name || '';
            document.getElementById('student-email').value = student.email || '';
            document.getElementById('class-group').value = student.class_group_id || '';
            
            // Update form title with student name
            document.getElementById('form-title').textContent = `Edit Student: ${student.name}`;
        })
        .catch(error => {
            console.error('Error loading student:', error);
            window.helpers.showToast('Failed to load student data: ' + error.message, 'error');
        });
}

// Save student data (create or update)
function saveStudent(mode) {
    // Get form values
    const name = document.getElementById('student-name').value;
    const email = document.getElementById('student-email').value;
    const classGroupId = document.getElementById('class-group').value;
    
    // Basic validation
    if (!name || !email) {
        window.helpers.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const studentData = {
        name,
        email,
        class_group_id: classGroupId ? parseInt(classGroupId) : null
    };
    
    // Send data to API
    if (mode === 'new') {
        // Create new student
        window.api.request('students', 'POST', studentData)
            .then(response => {
                window.helpers.showToast('Student created successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error creating student:', error);
                window.helpers.showToast('Failed to create student: ' + error.message, 'error');
            });
    } else {
        // Update existing student
        const params = window.helpers.getQueryParams();
        const studentId = params.id;
        
        window.api.request(`students/${studentId}`, 'PUT', studentData)
            .then(response => {
                window.helpers.showToast('Student updated successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error updating student:', error);
                window.helpers.showToast('Failed to update student: ' + error.message, 'error');
            });
    }
}

// Initialize the student import page
function initStudentImport() {
    // Set up file input change handler
    const fileInput = document.getElementById('csv-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Set up import form submission
    const importForm = document.getElementById('import-form');
    if (importForm) {
        importForm.addEventListener('submit', (e) => {
            e.preventDefault();
            importStudents();
        });
    }
}

// Handle file selection for CSV import
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        document.getElementById('file-name').textContent = 'No file selected';
        document.getElementById('preview-container').innerHTML = '';
        document.getElementById('import-button').disabled = true;
        return;
    }
    
    document.getElementById('file-name').textContent = file.name;
    
    // Parse and preview the CSV
    window.csvImporter.handleCSVUpload(
        file,
        (result) => {
            // Show preview
            document.getElementById('row-count').textContent = result.recordCount;
            window.csvImporter.previewCSV(
                result.headers, 
                result.data, 
                'preview-container'
            );
            
            // Enable import button
            document.getElementById('import-button').disabled = false;
        },
        (error) => {
            window.helpers.showToast(error, 'error');
            document.getElementById('preview-container').innerHTML = '';
            document.getElementById('import-button').disabled = true;
        }
    );
}

// Import students from CSV
function importStudents() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        window.helpers.showToast('Please select a CSV file', 'error');
        return;
    }
    
    // Show loading state
    document.getElementById('import-button').disabled = true;
    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Importing...';
    
    // Parse the CSV
    window.csvImporter.handleCSVUpload(
        file,
        (result) => {
            // Process the data
            const processedData = window.csvImporter.processStudentsCSV(result.data);
            
            // Import the data
            window.csvImporter.importData('students', processedData)
                .then(response => {
                    window.helpers.showToast(response.message, 'success');
                    
                    // Reset form
                    fileInput.value = '';
                    document.getElementById('file-name').textContent = 'No file selected';
                    document.getElementById('preview-container').innerHTML = '';
                    document.getElementById('import-button').disabled = true;
                    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Students';
                    
                    // Redirect to student list after a delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                })
                .catch(error => {
                    console.error('Error importing students:', error);
                    window.helpers.showToast('Failed to import students: ' + error.message, 'error');
                    
                    // Reset button
                    document.getElementById('import-button').disabled = false;
                    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Students';
                });
        },
        (error) => {
            window.helpers.showToast(error, 'error');
            
            // Reset button
            document.getElementById('import-button').disabled = false;
            document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Students';
        }
    );
}

// Expose functions to global scope for HTML onclick handlers
window.confirmDeleteStudent = confirmDeleteStudent;