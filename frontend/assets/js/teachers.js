// teachers.js - Teacher management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page based on the current URL
    const path = window.location.pathname;
    
    if (path.endsWith('/index.html') || path.endsWith('/teachers/')) {
        initTeacherList();
    } else if (path.includes('new.html')) {
        initTeacherForm('new');
    } else if (path.includes('edit.html')) {
        initTeacherForm('edit');
    } else if (path.includes('import.html')) {
        initTeacherImport();
    }
});

// Initialize the teacher list page
function initTeacherList() {
    // Load teachers
    loadTeachers();
    
    // Set up event listeners for filters
    document.getElementById('filter-role')?.addEventListener('change', loadTeachers);
    document.getElementById('search-teacher')?.addEventListener('input', loadTeachers);
}

// Load teachers with filters applied
function loadTeachers() {
    const tableBody = document.getElementById('teachers-table-body');
    if (!tableBody) return;
    
    // Get filter values
    const roleFilter = document.getElementById('filter-role')?.value;
    const searchFilter = document.getElementById('search-teacher')?.value.toLowerCase();
    
    // Filter teachers
    let filteredTeachers = [...window.dummyData.teachers];
    
    if (roleFilter) {
        if (roleFilter === 'admin') {
            filteredTeachers = filteredTeachers.filter(teacher => teacher.is_admin);
        } else if (roleFilter === 'teacher') {
            filteredTeachers = filteredTeachers.filter(teacher => !teacher.is_admin);
        }
    }
    
    if (searchFilter) {
        filteredTeachers = filteredTeachers.filter(teacher =>
            teacher.name.toLowerCase().includes(searchFilter) ||
            teacher.email.toLowerCase().includes(searchFilter)
        );
    }
    
    // Update pagination info
    document.getElementById('pagination-info').innerHTML = `
        Showing <span class="font-medium">1</span> to <span class="font-medium">${filteredTeachers.length}</span> of <span class="font-medium">${filteredTeachers.length}</span> results
    `;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no teachers found
    if (filteredTeachers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No teachers found matching filters.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each teacher
    filteredTeachers.forEach((teacher, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Check if it's the current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const isCurrentUser = currentUser && currentUser.id === teacher.id;
        
        // Role badge
        const roleBadge = teacher.is_admin
            ? '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Administrator</span>'
            : '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Teacher</span>';
        
        // Status badge
        const isActive = teacher.is_active !== false; // Default to true if not specified
        const statusBadge = isActive
            ? '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>'
            : '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${teacher.name}</div>
                ${isCurrentUser ? '<div class="text-xs text-gray-500 mt-1">(You)</div>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${teacher.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${roleBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="edit.html?id=${teacher.id}" class="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                ${isCurrentUser ? '' : `
                <button 
                    onclick="confirmDeleteTeacher(${teacher.id}, '${teacher.name}')" 
                    class="text-red-600 hover:text-red-900"
                >
                    Delete
                </button>
                `}
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Show confirmation modal for deleting a teacher
function confirmDeleteTeacher(teacherId, teacherName) {
    window.helpers.showConfirmModal(
        'Delete Teacher',
        `Are you sure you want to delete ${teacherName}? This action cannot be undone.`,
        () => deleteTeacher(teacherId)
    );
}

// Delete a teacher
function deleteTeacher(teacherId) {
    // Call the API to delete the teacher
    window.api.request(`teachers/${teacherId}`, 'DELETE')
        .then(response => {
            // Show success message
            window.helpers.showToast('Teacher deleted successfully', 'success');
            
            // Reload the teacher list
            loadTeachers();
        })
        .catch(error => {
            console.error('Error deleting teacher:', error);
            window.helpers.showToast('Failed to delete teacher: ' + error.message, 'error');
        });
}

// Initialize the teacher form (new or edit)
function initTeacherForm(mode) {
    // If in edit mode, load the teacher data
    if (mode === 'edit') {
        const params = window.helpers.getQueryParams();
        if (params.id) {
            loadTeacherForEdit(params.id);
        } else {
            window.helpers.showToast('Teacher ID not provided', 'error');
            window.location.href = 'index.html';
        }
    }
    
    // Set up reset password button if in edit mode
    if (mode === 'edit') {
        const resetPasswordBtn = document.getElementById('reset-password-btn');
        if (resetPasswordBtn) {
            resetPasswordBtn.addEventListener('click', function() {
                const params = window.helpers.getQueryParams();
                resetTeacherPassword(params.id);
            });
        }
    }
    
    // Set up form submission
    const form = document.getElementById('teacher-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveTeacher(mode);
        });
    }
}

// Load teacher data for editing
function loadTeacherForEdit(teacherId) {
    // Get teacher from API
    window.api.request(`teachers/${teacherId}`, 'GET')
        .then(teacher => {
            // Populate form fields
            document.getElementById('teacher-name').value = teacher.name || '';
            document.getElementById('teacher-email').value = teacher.email || '';
            document.getElementById('is-admin').checked = teacher.is_admin || false;
            
            // Only show active checkbox for edit form
            const isActiveCheckbox = document.getElementById('is-active');
            if (isActiveCheckbox) {
                isActiveCheckbox.checked = teacher.is_active !== false; // Default to true if not specified
            }
            
            // Update form title with teacher name
            document.getElementById('form-title').textContent = `Edit Teacher: ${teacher.name}`;
        })
        .catch(error => {
            console.error('Error loading teacher:', error);
            window.helpers.showToast('Failed to load teacher data: ' + error.message, 'error');
        });
}

// Reset teacher password
function resetTeacherPassword(teacherId) {
    // Call the API to reset password
    window.api.request(`auth/reset-password/${teacherId}`, 'POST')
        .then(response => {
            window.helpers.showToast('Password reset email sent successfully', 'success');
        })
        .catch(error => {
            console.error('Error resetting password:', error);
            window.helpers.showToast('Failed to reset password: ' + error.message, 'error');
        });
}

// Save teacher data (create or update)
function saveTeacher(mode) {
    // Get form values
    const name = document.getElementById('teacher-name').value;
    const email = document.getElementById('teacher-email').value;
    const isAdmin = document.getElementById('is-admin').checked;
    
    // Basic validation
    if (!name || !email) {
        window.helpers.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const teacherData = {
        name,
        email,
        is_admin: isAdmin
    };
    
    // Add password if in create mode and provided
    if (mode === 'new') {
        const password = document.getElementById('teacher-password')?.value;
        if (password) {
            teacherData.password = password;
        }
    }
    
    // Add is_active if in edit mode
    if (mode === 'edit') {
        const isActive = document.getElementById('is-active')?.checked;
        if (typeof isActive !== 'undefined') {
            teacherData.is_active = isActive;
        }
    }
    
    // Send data to API
    if (mode === 'new') {
        // Create new teacher
        window.api.request('teachers', 'POST', teacherData)
            .then(response => {
                window.helpers.showToast('Teacher created successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error creating teacher:', error);
                window.helpers.showToast('Failed to create teacher: ' + error.message, 'error');
            });
    } else {
        // Update existing teacher
        const params = window.helpers.getQueryParams();
        const teacherId = params.id;
        
        window.api.request(`teachers/${teacherId}`, 'PUT', teacherData)
            .then(response => {
                window.helpers.showToast('Teacher updated successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error updating teacher:', error);
                window.helpers.showToast('Failed to update teacher: ' + error.message, 'error');
            });
    }
}

// Initialize the teacher import page
function initTeacherImport() {
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
            importTeachers();
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

// Import teachers from CSV
function importTeachers() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        window.helpers.showToast('Please select a CSV file', 'error');
        return;
    }
    
    // Get email settings
    const sendWelcomeEmails = document.getElementById('send-welcome-emails').checked;
    
    // Show loading state
    document.getElementById('import-button').disabled = true;
    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Importing...';
    
    // Parse the CSV
    window.csvImporter.handleCSVUpload(
        file,
        (result) => {
            // Process the data
            const processedData = window.csvImporter.processTeachersCSV(result.data);
            
            // Add email setting
            const importData = {
                teachers: processedData,
                sendWelcomeEmails
            };
            
            // Import the data
            window.api.request('imports/teachers', 'POST', importData)
                .then(response => {
                    window.helpers.showToast(response.message, 'success');
                    
                    // Reset form
                    fileInput.value = '';
                    document.getElementById('file-name').textContent = 'No file selected';
                    document.getElementById('preview-container').innerHTML = '';
                    document.getElementById('import-button').disabled = true;
                    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Teachers';
                    
                    // Redirect to teacher list after a delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                })
                .catch(error => {
                    console.error('Error importing teachers:', error);
                    window.helpers.showToast('Failed to import teachers: ' + error.message, 'error');
                    
                    // Reset button
                    document.getElementById('import-button').disabled = false;
                    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Teachers';
                });
        },
        (error) => {
            window.helpers.showToast(error, 'error');
            
            // Reset button
            document.getElementById('import-button').disabled = false;
            document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Teachers';
        }
    );
}

// Expose functions to global scope for HTML onclick handlers
window.confirmDeleteTeacher = confirmDeleteTeacher;
