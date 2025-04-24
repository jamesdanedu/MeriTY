// academic-years.js - Academic year management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page based on the current URL
    const path = window.location.pathname;
    
    if (path.endsWith('/index.html') || path.endsWith('/academic-years/')) {
        initAcademicYearList();
    } else if (path.includes('new.html')) {
        initAcademicYearForm('new');
    } else if (path.includes('edit.html')) {
        initAcademicYearForm('edit');
    }
});

// Initialize the academic year list page
function initAcademicYearList() {
    // Load academic years
    loadAcademicYears();
}

// Load academic years
function loadAcademicYears() {
    const tableBody = document.getElementById('academic-years-table-body');
    if (!tableBody) return;
    
    // Get academic years from API (dummy data for now)
    window.api.request('academic-years', 'GET')
        .then(academicYears => {
            // Clear the table
            tableBody.innerHTML = '';
            
            // Show message if no academic years found
            if (academicYears.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                            No academic years found.
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Create table rows for each academic year
            academicYears.forEach((academicYear, index) => {
                // Count class groups for this academic year
                const classGroups = window.dummyData.classGroups.filter(cg => 
                    cg.academic_year_id === academicYear.id
                );
                
                const tr = document.createElement('tr');
                tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                
                // Format dates
                const startDate = window.helpers.formatDate(academicYear.start_date);
                const endDate = window.helpers.formatDate(academicYear.end_date);
                
                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${academicYear.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">${startDate}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">${endDate}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">${classGroups.length} groups</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href="edit.html?id=${academicYear.id}" class="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                        <button 
                            onclick="confirmDeleteAcademicYear(${academicYear.id}, '${academicYear.name}')" 
                            class="text-red-600 hover:text-red-900"
                        >
                            Delete
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error loading academic years:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-red-500">
                        Error loading academic years. Please try again.
                    </td>
                </tr>
            `;
        });
}

// Show confirmation modal for deleting an academic year
function confirmDeleteAcademicYear(academicYearId, academicYearName) {
    // Check if there are class groups associated with this academic year
    const associatedClassGroups = window.dummyData.classGroups.filter(cg => 
        cg.academic_year_id === academicYearId
    );
    
    let message = `Are you sure you want to delete ${academicYearName}? This action cannot be undone.`;
    
    if (associatedClassGroups.length > 0) {
        message += `<br><br><strong class="text-red-600">Warning:</strong> This academic year has ${associatedClassGroups.length} class groups associated with it. Deleting it will also delete all associated class groups, students, and credits.`;
    }
    
    window.helpers.showConfirmModal(
        'Delete Academic Year',
        message,
        () => deleteAcademicYear(academicYearId)
    );
}

// Delete an academic year
function deleteAcademicYear(academicYearId) {
    // Call the API to delete the academic year
    window.api.request(`academic-years/${academicYearId}`, 'DELETE')
        .then(response => {
            // Show success message
            window.helpers.showToast('Academic year deleted successfully', 'success');
            
            // Reload the academic year list
            loadAcademicYears();
        })
        .catch(error => {
            console.error('Error deleting academic year:', error);
            window.helpers.showToast('Failed to delete academic year: ' + error.message, 'error');
        });
}

// Initialize the academic year form (new or edit)
function initAcademicYearForm(mode) {
    // Set default dates for new academic year form
    if (mode === 'new') {
        // Set start date to September 1st of current year
        const currentYear = new Date().getFullYear();
        document.getElementById('start-date').value = `${currentYear}-09-01`;
        
        // Set end date to June 30th of next year
        document.getElementById('end-date').value = `${currentYear + 1}-06-30`;
        
        // Suggest academic year name
        document.getElementById('academic-year-name').value = `${currentYear}-${currentYear + 1}`;
    } else if (mode === 'edit') {
        // Get academic year ID from URL
        const params = window.helpers.getQueryParams();
        if (params.id) {
            loadAcademicYearForEdit(params.id);
        } else {
            window.helpers.showToast('Academic year ID not provided', 'error');
            window.location.href = 'index.html';
        }
    }
    
    // Set up form submission
    const form = document.getElementById('academic-year-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAcademicYear(mode);
        });
    }
}

// Load academic year data for editing
function loadAcademicYearForEdit(academicYearId) {
    // Get academic year from API
    window.api.request(`academic-years/${academicYearId}`, 'GET')
        .then(academicYear => {
            // Populate form fields
            document.getElementById('academic-year-name').value = academicYear.name || '';
            document.getElementById('start-date').value = formatDateForInput(academicYear.start_date);
            document.getElementById('end-date').value = formatDateForInput(academicYear.end_date);
        })
        .catch(error => {
            console.error('Error loading academic year:', error);
            window.helpers.showToast('Failed to load academic year data: ' + error.message, 'error');
        });
}

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Save academic year data (create or update)
function saveAcademicYear(mode) {
    // Get form values
    const name = document.getElementById('academic-year-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    // Basic validation
    if (!name || !startDate || !endDate) {
        window.helpers.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
        window.helpers.showToast('Start date must be before end date', 'error');
        return;
    }
    
    const academicYearData = {
        name,
        start_date: startDate,
        end_date: endDate
    };
    
    // Send data to API
    if (mode === 'new') {
        // Create new academic year
        window.api.request('academic-years', 'POST', academicYearData)
            .then(response => {
                window.helpers.showToast('Academic year created successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error creating academic year:', error);
                window.helpers.showToast('Failed to create academic year: ' + error.message, 'error');
            });
    } else {
        // Update existing academic year
        const params = window.helpers.getQueryParams();
        const academicYearId = params.id;
        
        window.api.request(`academic-years/${academicYearId}`, 'PUT', academicYearData)
            .then(response => {
                window.helpers.showToast('Academic year updated successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error updating academic year:', error);
                window.helpers.showToast('Failed to update academic year: ' + error.message, 'error');
            });
    }
}

// Expose functions to global scope for HTML onclick handlers
window.confirmDeleteAcademicYear = confirmDeleteAcademicYear;
