// helpers.js - Utility functions for the application

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, warning, info)
 * @param {number} duration - How long to show the notification in ms
 */
function showToast(message, type = 'info', duration = 3000) {
    console.log(`Toast: [${type}] ${message}`); // Debug logging
    
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }
    
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

// Expose helper functions to global scope
window.helpers = {
    showToast,
    showConfirmModal,
    closeModal,
    getQueryParams
};
