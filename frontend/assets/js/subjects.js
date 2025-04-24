// subjects.js - Subject management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page based on the current URL
    const path = window.location.pathname;
    
    if (path.endsWith('/index.html') || path.endsWith('/subjects/')) {
        initSubjectList();
    } else if (path.includes('new.html')) {
        initSubjectForm('new');
    } else if (path.includes('edit.html')) {
        initSubjectForm('edit');
    } else if (path.includes('import.html')) {
        initSubjectImport();
    }
});

// Initialize the subject list page
function initSubjectList() {
    // Populate academic year filter
    populateAcademicYearFilter();
    
    // Load subjects
    loadSubjects();
    
    // Set up event listeners for filters
    document.getElementById('filter-academic-year')?.addEventListener('change', loadSubjects);
    document.getElementById('filter-type')?.addEventListener('change', loadSubjects);
    document.getElementById('search-subject')?.addEventListener('input', loadSubjects);
}

// Populate the academic year filter dropdown
function populateAcademicYearFilter() {
    const filterSelect = document.getElementById('filter-academic-year');
    if (!filterSelect) return;
    
    // Clear existing options (except for "All Academic Years")
    const firstOption = filterSelect.options[0];
    filterSelect.innerHTML = '';
    filterSelect.appendChild(firstOption);
    
    // Add academic years from dummy data
    window.dummyData.academicYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.id;
        option.textContent = year.name;
        filterSelect.appendChild(option);
    });
}

// Load subjects with filters applied
function loadSubjects() {
    const tableBody = document.getElementById('subjects-table-body');
    if (!tableBody) return;
    
    // Get filter values
    const academicYearFilter = document.getElementById('filter-academic-year')?.value;
    const typeFilter = document.getElementById('filter-type')?.value;
    const searchFilter = document.getElementById('search-subject')?.value.toLowerCase();
    
    // Filter subjects
    let filteredSubjects = [...window.dummyData.subjects];
    
    if (academicYearFilter) {
        filteredSubjects = filteredSubjects.filter(subject => 
            subject.academic_year_id == academicYearFilter
        );
    }
    
    if (typeFilter) {
        if (typeFilter === 'core') {
            filteredSubjects = filteredSubjects.filter(subject => subject.is_core);
        } else if (typeFilter === 'optional') {
            filteredSubjects = filteredSubjects.filter(subject => !subject.is_core);
        }
    }
    
    if (searchFilter) {
        filteredSubjects = filteredSubjects.filter(subject =>
            subject.name.toLowerCase().includes(searchFilter)
        );
    }
    
    // Update pagination info
    document.getElementById('pagination-info').innerHTML = `
        Showing <span class="font-medium">1</span> to <span class="font-medium">${filteredSubjects.length}</span> of <span class="font-medium">${filteredSubjects.length}</span> results
    `;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no subjects found
    if (filteredSubjects.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No subjects found matching filters.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each subject
    filteredSubjects.forEach((subject, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Find academic year
        const academicYear = window.dummyData.academicYears.find(ay => ay.id === subject.academic_year_id);
        const academicYearName = academicYear ? academicYear.name : 'Unknown';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${subject.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${subject.is_core ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    ${subject.is_core ? 'Core' : 'Optional'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${subject.credit_value} credits</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${academicYearName}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="edit.html?id=${subject.id}" class="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                <button 
                    onclick="confirmDeleteSubject(${subject.id}, '${subject.name}')" 
                    class="text-red-600 hover:text-red-900"
                >
                    Delete
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Show confirmation modal for deleting a subject
function confirmDeleteSubject(subjectId, subjectName) {
    // Check if there are enrollments associated with this subject
    const associatedEnrollments = window.dummyData.enrollments.filter(e => 
        e.subject_id === subjectId
    );
    
    let message = `Are you sure you want to delete ${subjectName}? This action cannot be undone.`;
    
    if (associatedEnrollments.length > 0) {
        message += `<br><br><strong class="text-red-600">Warning:</strong> This subject has ${associatedEnrollments.length} student enrollments associated with it. Deleting it will remove all associated credits.`;
    }
    
    window.helpers.showConfirmModal(
        'Delete Subject',
        message,
        () => deleteSubject(subjectId)
    );
}

// Delete a subject
function deleteSubject(subjectId) {
    // Call the API to delete the subject
    window.api.request(`subjects/${subjectId}`, 'DELETE')
        .then(response => {
            // Show success message
            window.helpers.showToast('Subject deleted successfully', 'success');
            
            // Reload the subject list
            loadSubjects();
        })
        .catch(error => {
            console.error('Error deleting subject:', error);
            window.helpers.showToast('Failed to delete subject: ' + error.message, 'error');
        });
}

// Initialize the subject form (new or edit)
function initSubjectForm(mode) {
    // Populate academic year select
    populateAcademicYearSelect();
    
    // Set default values for new subject form
    if (mode === 'new') {
        // Set default credit value
        document.getElementById('credit-value').value = '10';
        
        // Select the first academic year by default
        const academicYearSelect = document.getElementById('academic-year');
        if (academicYearSelect && window.dummyData.academicYears.length > 0) {
            academicYearSelect.value = window.dummyData.academicYears[0].id;
        }
    } else if (mode === 'edit') {
        // Get subject ID from URL
        const params = window.helpers.getQueryParams();
        if (params.id) {
            loadSubjectForEdit(params.id);
        } else {
            window.helpers.showToast('Subject ID not provided', 'error');
            window.location.href = 'index.html';
        }
    }
    
    // Set up form submission
    const form = document.getElementById('subject-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSubject(mode);
        });
    }
}

// Populate the academic year select dropdown
function populateAcademicYearSelect() {
    const academicYearSelect = document.getElementById('academic-year');
    if (!academicYearSelect) return;
    
    // Clear existing options
    academicYearSelect.innerHTML = '<option value="">Select Academic Year</option>';
    
    // Add academic years from dummy data
    window.dummyData.academicYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.id;
        option.textContent = year.name;
        academicYearSelect.appendChild(option);
    });
}

// Load subject data for editing
function loadSubjectForEdit(subjectId) {
    // Get subject from API
    window.api.request(`subjects/${subjectId}`, 'GET')
        .then(subject => {
            // Populate form fields
            document.getElementById('subject-name').value = subject.name || '';
            document.getElementById('credit-value').value = subject.credit_value || '';
            document.getElementById('is-core').checked = subject.is_core || false;
            document.getElementById('academic-year').value = subject.academic_year_id || '';
        })
        .catch(error => {
            console.error('Error loading subject:', error);
            window.helpers.showToast('Failed to load subject data: ' + error.message, 'error');
        });
}

// Save subject data (create or update)
function saveSubject(mode) {
    // Get form values
    const name = document.getElementById('subject-name').value;
    const creditValue = document.getElementById('credit-value').value;
    const isCore = document.getElementById('is-core').checked;
    const academicYearId = document.getElementById('academic-year').value;
    
    // Basic validation
    if (!name || !creditValue || !academicYearId) {
        window.helpers.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const subjectData = {
        name,
        credit_value: parseInt(creditValue),
        is_core: isCore,
        academic_year_id: parseInt(academicYearId)
    };
    
    // Send data to API
    if (mode === 'new') {
        // Create new subject
        window.api.request('subjects', 'POST', subjectData)
            .then(response => {
                window.helpers.showToast('Subject created successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error creating subject:', error);
                window.helpers.showToast('Failed to create subject: ' + error.message, 'error');
            });
    } else {
        // Update existing subject
        const params = window.helpers.getQueryParams();
        const subjectId = params.id;
        
        window.api.request(`subjects/${subjectId}`, 'PUT', subjectData)
            .then(response => {
                window.helpers.showToast('Subject updated successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error updating subject:', error);
                window.helpers.showToast('Failed to update subject: ' + error.message, 'error');
            });
    }
}

// Initialize the subject import page
function initSubjectImport() {
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
            importSubjects();
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

// Import subjects from CSV
function importSubjects() {
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
            const processedData = window.csvImporter.processSubjectsCSV(result.data);
            
            // Import the data
            window.csvImporter.importData('subjects', processedData)
                .then(response => {
                    window.helpers.showToast(response.message, 'success');
                    
                    // Reset form
                    fileInput.value = '';
                    document.getElementById('file-name').textContent = 'No file selected';
                    document.getElementById('preview-container').innerHTML = '';
                    document.getElementById('import-button').disabled = true;
                    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Subjects';
                    
                    // Redirect to subject list after a delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                })
                .catch(error => {
                    console.error('Error importing subjects:', error);
                    window.helpers.showToast('Failed to import subjects: ' + error.message, 'error');
                    
                    // Reset button
                    document.getElementById('import-button').disabled = false;
                    document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Subjects';
                });
        },
        (error) => {
            window.helpers.showToast(error, 'error');
            
            // Reset button
            document.getElementById('import-button').disabled = false;
            document.getElementById('import-button').innerHTML = '<i class="fa-solid fa-file-import mr-2"></i> Import Subjects';
        }
    );
}

// Expose functions to global scope for HTML onclick handlers
window.confirmDeleteSubject = confirmDeleteSubject;
