// Configuration
const API_URL = 'http://localhost:8000'; // FastAPI backend URL
const SUPABASE_URL = 'your_supabase_url';

// Helper function to check authentication state
function isAuthenticated() {
    return localStorage.getItem('access_token') !== null;
}

// Helper function to get the auth token
function getToken() {
    return localStorage.getItem('access_token');
}

// Helper function for making authenticated API requests
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(url, mergedOptions);
    
    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
        // Try to refresh the token
        const refreshed = await refreshToken();
        
        if (refreshed) {
            // Retry the request with the new token
            mergedOptions.headers['Authorization'] = `Bearer ${getToken()}`;
            return fetch(url, mergedOptions);
        } else {
            // Redirect to login if refresh failed
            logout();
            throw new Error('Authentication expired. Please log in again.');
        }
    }
    
    return response;
}

// Function to refresh the token
async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
        return false;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apiKey': SUPABASE_KEY
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }
        
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

// Function to log out
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = 'login.html';
}

// Function to get user profile
async function getUserProfile() {
    try {
        const response = await fetchWithAuth(`${SUPABASE_URL}/auth/v1/user`);
        
        if (!response.ok) {
            throw new Error('Failed to get user profile');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

// Function to fetch data from a protected API endpoint
async function fetchProtectedData(endpoint) {
    try {
        const response = await fetchWithAuth(`${API_URL}/${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data from ${endpoint}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${endpoint}:`, error);
        throw error;
    }
}

// Export functions for use in other scripts
window.appAuth = {
    isAuthenticated,
    getToken,
    fetchWithAuth,
    logout,
    getUserProfile,
    fetchProtectedData
};

// Initialize app on document load
document.addEventListener('DOMContentLoaded', () => {
    // Add common initialization code here
    console.log('App initialized');
    
    // For pages that should be protected, redirect if not authenticated
    const protectedPages = ['dashboard.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        window.location.href = 'login.html';
    }
    
    // For the login page, redirect to dashboard if already authenticated
    if (currentPage === 'login.html' && isAuthenticated()) {
        window.location.href = 'dashboard.html';
    }
});