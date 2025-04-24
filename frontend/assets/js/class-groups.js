// class-groups.js - Class group management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page based on the current URL
    const path = window.location.pathname;
    
    if (path.endsWith('/index.html') || path.endsWith('/class-groups/')) {
        initClassGroupList();
    } else if (path.includes('new.html')) {
        initClassGroupForm('new');
    } else if (path.includes('edit.html')) {
        initClassGroupForm('edit');
    }
});

// Initialize the class group list page
function initClassGroupList() {
    // Populate academic year filter
    populateAcademicYearFilter();
    
    // Load class groups
    loadClassGroups();
    
    // Set up event listeners for filters
    document.getElementById('filter-academic-year')?.addEventListener('change', loadClassGroups);
    document.getElementById('search-class-group')?.addEventListener('input', loadClassGroups);
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

// Load class groups with filters applied
function loadClassGroups() {
    const tableBody = document.getElementById('class-groups-table-body');
    if (!tableBody) return;
    
    // Get filter values
    const academicYearFilter = document.getElementById('filter-academic-year')?.value;
    const searchFilter = document.getElementById('search-class-group')?.value.toLowerCase();
    
    // Filter class groups
    let filteredClassGroups = [...window.dummyData.classGroups];
    
    if (academicYearFilter) {
        filteredClassGroups = filteredClassGroups.filter(group => 
            group.academic_year_id == academicYearFilter
        );
    }
    
    if (searchFilter) {
        filteredClassGroups = filteredClassGroups.filter(group =>
            group.name.toLowerCase().includes(searchFilter)
        );
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Show message if no class groups found
    if (filteredClassGroups.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    No class groups found matching filters.
                </td>
            </tr>
        `;
        return;
    }
    
    // Create table rows for each class group
    filteredClassGroups.forEach((group, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Find academic year
        const academicYear = window.dummyData.academicYears.find(ay => ay.id === group.academic_year_id);
        const academicYearName = academicYear ? academicYear.name : 'Unknown';
        
        // Count students in this class group
        const studentCount = window.dummyData.students.filter(s => s.class_group_id === group.id).length;
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${group.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${academicYearName}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${studentCount} students</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="edit.html?id=${group.id}" class="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                <button 
                    onclick="confirmDeleteClassGroup(${group.id}, '${group.name}')" 
                    class="text-red-600 hover:text-red-900"
                >
                    Delete
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Show confirmation modal for deleting a class group
function confirmDeleteClassGroup(groupId, groupName) {
    // Check if there are students associated with this class group
    const associatedStudents = window.dummyData.students.filter(s => 
        s.class_group_id === groupId
    );
    
    let message = `Are you sure you want to delete ${groupName}? This action cannot be undone.`;
    
    if (associatedStudents.length > 0) {
        message += `<br><br><strong class="text-red-600">Warning:</strong> This class group has ${associatedStudents.length} students assigned to it. Deleting it will remove the class assignment from these students.`;
    }
    
    window.helpers.showConfirmModal(
        'Delete Class Group',
        message,
        () => deleteClassGroup(groupId)
    );
}

// Delete a class group
function deleteClassGroup(groupId) {
    // Call the API to delete the class group
    window.api.request(`class-groups/${groupId}`, 'DELETE')
        .then(response => {
            // Show success message
            window.helpers.showToast('Class group deleted successfully', 'success');
            
            // Reload the class group list
            loadClassGroups();
        })
        .catch(error => {
            console.error('Error deleting class group:', error);
            window.helpers.showToast('Failed to delete class group: ' + error.message, 'error');
        });
}

// Initialize the class group form (new or edit)
function initClassGroupForm(mode) {
    // Populate academic year select
    populateAcademicYearSelect();
    
    // Set default values for new class group form
    if (mode === 'new') {
        // Select the first academic year by default
        const academicYearSelect = document.getElementById('academic-year');
        if (academicYearSelect && window.dummyData.academicYears.length > 0) {
            academicYearSelect.value = window.dummyData.academicYears[0].id;
        }
    } else if (mode === 'edit') {
        // Get class group ID from URL
        const params = window.helpers.getQueryParams();
        if (params.id) {
            loadClassGroupForEdit(params.id);
        } else {
            window.helpers.showToast('Class group ID not provided', 'error');
            window.location.href = 'index.html';
        }
    }
    
    // Set up form submission
    const form = document.getElementById('class-group-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveClassGroup(mode);
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

// Load class group data for editing
function loadClassGroupForEdit(groupId) {
    // Get class group from API
    window.api.request(`class-groups/${groupId}`, 'GET')
        .then(classGroup => {
            // Populate form fields
            document.getElementById('class-group-name').value = classGroup.name || '';
            document.getElementById('academic-year').value = classGroup.academic_year_id || '';
            
            // Update form title with class group name
            document.getElementById('form-title').textContent = `Edit Class Group: ${classGroup.name}`;
            
            // Update statistics
            updateClassGroupStatistics(groupId);
            
            // Set up view students link
            const viewStudentsLink = document.getElementById('view-students-link');
            if (viewStudentsLink) {
                viewStudentsLink.href = `../students/index.html?class_group_id=${groupId}`;
            }
        })
        .catch(error => {
            console.error('Error loading class group:', error);
            window.helpers.showToast('Failed to load class group data: ' + error.message, 'error');
        });
}

// Update class group statistics
function updateClassGroupStatistics(groupId) {
    // Count students in this class group
    const students = window.dummyData.students.filter(s => s.class_group_id == groupId);
    document.getElementById('student-count').textContent = students.length;
    
    // Calculate average credits
    if (students.length > 0) {
        let totalCredits = 0;
        students.forEach(student => {
            totalCredits += window.helpers.getStudentTotalCredits(student.id);
        });
        const averageCredits = Math.round(totalCredits / students.length);
        document.getElementById('average-credits').textContent = averageCredits;
    } else {
        document.getElementById('average-credits').textContent = 'N/A';
    }
}

// Save class group data (create or update)
function saveClassGroup(mode) {
    // Get form values
    const name = document.getElementById('class-group-name').value;
    const academicYearId = document.getElementById('academic-year').value;
    
    // Basic validation
    if (!name || !academicYearId) {
        window.helpers.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const classGroupData = {
        name,
        academic_year_id: parseInt(academicYearId)
    };
    
    // Send data to API
    if (mode === 'new') {
        // Create new class group
        window.api.request('class-groups', 'POST', classGroupData)
            .then(response => {
                window.helpers.showToast('Class group created successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error creating class group:', error);
                window.helpers.showToast('Failed to create class group: ' + error.message, 'error');
            });
    } else {
        // Update existing class group
        const params = window.helpers.getQueryParams();
        const groupId = params.id;
        
        window.api.request(`class-groups/${groupId}`, 'PUT', classGroupData)
            .then(response => {
                window.helpers.showToast('Class group updated successfully', 'success');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error updating class group:', error);
                window.helpers.showToast('Failed to update class group: ' + error.message, 'error');
            });
    }
}

// Expose functions to global scope for HTML onclick handlers
window.confirmDeleteClassGroup = confirmDeleteClassGroup;