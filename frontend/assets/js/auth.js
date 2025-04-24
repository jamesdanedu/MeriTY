// auth.js - Handles authentication functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkAuthStatus();

    // Set up login form event listener
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Set up password reset form event listener
    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
        resetForm.addEventListener('submit', handlePasswordReset);
    }

    // Set up new password form event listener
    const newPasswordForm = document.getElementById('new-password-form');
    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', handleNewPassword);
    }
});

// Check if user is already logged in
function checkAuthStatus() {
    const currentUser = localStorage.getItem('currentUser');
    
    // If on login page and already logged in, redirect to dashboard
    if (currentUser && window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // If not on login page and not logged in, redirect to login
    if (!currentUser && !window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('reset-password.html')) {
        window.location.href = 'login.html';
        return;
    }
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    // Reset error message
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    
    // For demo purposes, check against dummy data
    // In production, this would make an API call
    const user = window.dummyData.teachers.find(teacher => 
        teacher.email === email
    );
    
    if (user) {
        // In a real app, we would check password hash
        // For demo, we'll just simulate successful login
        
        // Check if this is first login (would check a flag in production)
        const isFirstLogin = !localStorage.getItem('hasLoggedIn_' + user.id);
        
        // Store user info in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // If first login, redirect to change password page
        if (isFirstLogin) {
            window.location.href = 'reset-password.html?firstLogin=true';
        } else {
            // Otherwise go to dashboard
            window.location.href = 'dashboard.html';
        }
    } else {
        // Show error
        errorDiv.textContent = 'Invalid email or password. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

// Handle password reset request
function handlePasswordReset(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const messageDiv = document.getElementById('reset-message');
    
    // Reset message
    messageDiv.className = 'mt-4 text-center hidden';
    messageDiv.textContent = '';
    
    // Check if email exists in our system
    const user = window.dummyData.teachers.find(teacher => 
        teacher.email === email
    );
    
    if (user) {
        // In production, this would trigger an email with reset link
        messageDiv.textContent = 'Password reset instructions have been sent to your email.';
        messageDiv.classList.add('text-green-600');
        messageDiv.classList.remove('hidden');
    } else {
        messageDiv.textContent = 'Email not found. Please check and try again.';
        messageDiv.classList.add('text-red-600');
        messageDiv.classList.remove('hidden');
    }
}

// Handle setting a new password
function handleNewPassword(event) {
    event.preventDefault();
    
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const messageDiv = document.getElementById('password-message');
    
    // Reset message
    messageDiv.className = 'mt-4 text-center hidden';
    messageDiv.textContent = '';
    
    // Check if passwords match
    if (password !== confirmPassword) {
        messageDiv.textContent = 'Passwords do not match. Please try again.';
        messageDiv.classList.add('text-red-600');
        messageDiv.classList.remove('hidden');
        return;
    }
    
    // Check password strength (simple example)
    if (password.length < 8) {
        messageDiv.textContent = 'Password must be at least 8 characters long.';
        messageDiv.classList.add('text-red-600');
        messageDiv.classList.remove('hidden');
        return;
    }
    
    // In production, this would update the password in the database
    // For demo, we'll just simulate successful password update
    
    // Get user from localStorage if available
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Mark as having logged in before
    if (currentUser.id) {
        localStorage.setItem('hasLoggedIn_' + currentUser.id, 'true');
    }
    
    messageDiv.textContent = 'Password updated successfully. Redirecting to dashboard...';
    messageDiv.classList.add('text-green-600');
    messageDiv.classList.remove('hidden');
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

// Handle logout
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Expose the logout function globally
window.logout = logout;