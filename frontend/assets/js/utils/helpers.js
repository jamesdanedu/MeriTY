// helpers.js - Utility functions for the application

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, warning, info)
 * @param {number} duration - How long to show the notification in ms
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) return;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `mb-3 p-3 rounded shadow-md max-w-md transition-opacity duration-300 flex items-center`;
    
    // Set color based on type
    switch(type) {
        case 'success':
            toast.classList.add('bg-green-500', 'text-white');
            toast.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i> ${message}`;
            break;
        case 'error':
            toast.classList.add('bg-red-500', 'text-white');
            toast.innerHTML = `<i class="fa-solid fa-exclamation-circle mr-2"></i> ${message}`;
            break;
        case 'warning':
            toast.classList.add('bg-yellow-500', 'text-white');
            toast.innerHTML = `<i class="fa-solid fa-exclamation-triangle mr-2"></i> ${message}`;
            break;
        case 'info':
        default:
            toast.classList.add('bg-blue-500', 'text-white');
            toast.innerHTML = `<i class="fa-solid fa-info-circle mr-2"></i> ${message}`;
    }
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, duration);
}

/**
 * Shows a confirmation modal
 * @param {string} title - The modal title
 * @param {string} message - The confirmation message
 * @param {Function} onConfirm - Function to call when confirmed
 * @param {Function} onCancel - Function to call when canceled (optional)
 */
function showConfirmModal(title, message, onConfirm, onCancel = null) {
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    
    if (!modalContainer || !modalContent) return;
    
    // Create modal content
    modalContent.innerHTML = `
        <div class="text-center">
            <h3 class="text-lg font-medium text-gray-900 mb-4">${title}</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            
            <div class="flex justify-center space-x-4">
                <button id="modal-cancel" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Cancel
                </button>
                <button id="modal-confirm" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                    Confirm
                </button>
            </div>
        </div>
    `;
    
    // Show the modal
    modalContainer.classList.remove('hidden');
    
    // Set up event listeners
    document.getElementById('modal-confirm').addEventListener('click', () => {
        if (onConfirm) onConfirm();
        closeModal();
    });
    
    document.getElementById('modal-cancel').addEventListener('click', () => {
        if (onCancel) onCancel();
        closeModal();
    });
}

/**
 * Close the modal
 */
function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.classList.add('hidden');
    }
}

/**
 * Format a date as YYYY-MM-DD
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Get URL query parameters
 * @returns {Object} Object with query parameters
 */
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    
    if (queryString) {
        const pairs = queryString.split('&');
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
    }
    
    return params;
}

/**
 * Parse CSV data
 * @param {string} csvText - The CSV data as a string
 * @param {boolean} hasHeader - Whether the CSV has a header row
 * @returns {Object} Object with headers and data rows
 */
function parseCSV(csvText, hasHeader = true) {
    const lines = csvText.split(/\r?\n/);
    let headers = [];
    let data = [];
    
    if (lines.length === 0) return { headers, data };
    
    if (hasHeader) {
        headers = lines[0].split(',').map(h => h.trim());
        lines.shift();
    } else {
        // If no header, generate column names (Column1, Column2, etc.)
        const firstRow = lines[0].split(',');
        headers = Array.from({ length: firstRow.length }, (_, i) => `Column${i + 1}`);
    }
    
    // Process data rows
    for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines
        
        const values = line.split(',').map(v => v.trim());
        const row = {};
        
        // Map values to headers
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        data.push(row);
    }
    
    return { headers, data };
}

/**
 * Get the total credits for a student
 * @param {number} studentId - The student ID
 * @returns {number} Total credits
 */
function getStudentTotalCredits(studentId) {
    let total = 0;
    
    // Add subject credits
    const enrollments = window.dummyData.enrollments.filter(e => e.student_id === studentId);
    enrollments.forEach(enrollment => {
        total += enrollment.credits_earned || 0;
    });
    
    // Add work experience credits
    const workExperience = window.dummyData.workExperience.filter(w => w.student_id === studentId);
    workExperience.forEach(experience => {
        total += experience.credits_earned || 0;
    });
    
    // Add portfolio credits
    const portfolios = window.dummyData.portfolios.filter(p => p.student_id === studentId);
    portfolios.forEach(portfolio => {
        total += portfolio.credits_earned || 0;
    });
    
    return total;
}

/**
 * Find an object in an array by ID
 * @param {Array} array - The array to search
 * @param {number} id - The ID to find
 * @returns {Object|null} The found object or null
 */
function findById(array, id) {
    return array.find(item => item.id === id) || null;
}

// Export helper functions to the global scope
window.helpers = {
    showToast,
    showConfirmModal,
    closeModal,
    formatDate,
    getQueryParams,
    parseCSV,
    getStudentTotalCredits,
    findById
};