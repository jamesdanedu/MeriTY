// auth.js - Authentication utilities for MeriTY Credits Tracker

// API Base URL
const API_URL = '/api/v1';

/**
 * Check if user is authenticated
 * @returns {Promise<Object>} Authentication status and user info
 */
async function checkAuth() {
  try {
    const response = await fetch(`${API_URL}/auth/check-auth`);
    return await response.json();
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false };
  }
}

/**
 * Get current user info
 * @returns {Promise<Object>} User data if authenticated
 */
async function getCurrentUser() {
  try {
    const response = await fetch(`${API_URL}/auth/me`);
    const data = await response.json();
    
    if (data.success) {
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Log out the current user
 * @returns {Promise<boolean>} Success status
 */
async function logout() {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST'
    });
    const data = await response.json();
    
    if (data.success) {
      // Redirect to login page
      window.location.href = '/login.html';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * Protect a page - redirect to login if not authenticated
 * Also handles password change requirement
 */
async function protectPage() {
  const authStatus = await checkAuth();
  
  if (!authStatus.authenticated) {
    // Not authenticated, redirect to login
    window.location.href = '/login.html';
    return;
  }
  
  if (authStatus.authenticated && !authStatus.passwordChanged) {
    // Password change required
    if (!window.location.pathname.includes('change-password.html')) {
      // Redirect to password change page
      window.location.href = '/change-password.html?force=true';
      return;
    }
  }
  
  return authStatus;
}

/**
 * Check if user is an admin
 * @returns {Promise<boolean>} True if user is admin
 */
async function isAdmin() {
  const authStatus = await checkAuth();
  return authStatus.authenticated && authStatus.isAdmin;
}

/**
 * Protect admin pages - redirect if not admin
 */
async function protectAdminPage() {
  const admin = await isAdmin();
  
  if (!admin) {
    // Not admin, redirect to dashboard
    window.location.href = '/dashboard.html';
  }
}

/**
 * Format error message from API response
 * @param {Response} response The fetch Response object
 * @returns {Promise<string>} Formatted error message
 */
async function getErrorMessage(response) {
  try {
    const data = await response.json();
    return data.message || 'An error occurred';
  } catch (error) {
    return 'An error occurred';
  }
}

/**
 * Set up navigation menu based on user role
 * @param {string} currentPage - Current page identifier
 */
async function setupNavigation(currentPage) {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  
  const authStatus = await checkAuth();
  
  if (!authStatus.authenticated) {
    // Not authenticated, show only public links
    nav.innerHTML = `
      <a href="login.html" class="px-3 py-2 text-sm font-medium ${currentPage === 'login' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md">Login</a>
    `;
    return;
  }
  
  // Get user data
  const user = await getCurrentUser();
  
  // Basic navigation for all authenticated users
  let navHtml = `
    <a href="dashboard.html" class="px-3 py-2 text-sm font-medium ${currentPage === 'dashboard' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md">Dashboard</a>
    <a href="students.html" class="px-3 py-2 text-sm font-medium ${currentPage === 'students' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md">Students</a>
    <a href="subjects.html" class="px-3 py-2 text-sm font-medium ${currentPage === 'subjects' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md">Subjects</a>
    <a href="credits.html" class="px-3 py-2 text-sm font-medium ${currentPage === 'credits' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md">Credits</a>
  `;
  
  // Add admin links
  if (user && user.isAdmin) {
    navHtml += `
      <a href="admin.html" class="px-3 py-2 text-sm font-medium ${currentPage === 'admin' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md">Admin</a>
    `;
  }
  
  // Add user menu
  navHtml += `
    <div class="ml-3 relative">
      <div>
        <button id="user-menu-button" type="button" class="flex text-sm rounded-full focus:outline-none" aria-expanded="false" aria-haspopup="true">
          <span class="sr-only">Open user menu</span>
          <span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-500">
            <span class="text-sm font-medium leading-none text-white">${user ? user.name.substring(0, 2).toUpperCase() : 'U'}</span>
          </span>
        </button>
      </div>
      <div id="user-menu" class="hidden origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
        <a href="profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">${user ? user.name : 'User'}</a>
        <a href="change-password.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Change Password</a>
        <a href="#" id="logout-button" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Sign out</a>
      </div>
    </div>
  `;
  
  nav.innerHTML = navHtml;
  
  // Set up user menu toggle
  const userMenuButton = document.getElementById('user-menu-button');
  const userMenu = document.getElementById('user-menu');
  
  if (userMenuButton && userMenu) {
    userMenuButton.addEventListener('click', () => {
      userMenu.classList.toggle('hidden');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
        userMenu.classList.add('hidden');
      }
    });
  }
  
  // Set up logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// Export functions for use in other scripts
window.authUtils = {
  checkAuth,
  getCurrentUser,
  logout,
  protectPage,
  isAdmin,
  protectAdminPage,
  getErrorMessage,
  setupNavigation
};

