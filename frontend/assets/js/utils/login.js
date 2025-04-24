// Login page authentication script

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser) {
        window.location.href = '/pages/dashboard.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Reset error message
            if (loginError) {
                loginError.textContent = '';
                loginError.classList.add('hidden');
            }

            // Get form values
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const rememberMeInput = document.getElementById('remember-me');

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const rememberMe = rememberMeInput.checked;

            try {
                // Attempt login using the new API service
                const user = await window.apiService.auth.login(email, password);

                // Optional: Store remember me preference
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    localStorage.removeItem('rememberMe');
                }

                // Redirect to dashboard
                window.location.href = '/pages/dashboard.html';
            } catch (error) {
                // Show error message
                if (loginError) {
                    loginError.textContent = 'Invalid email or password';
                    loginError.classList.remove('hidden');
                }

                // Clear password field
                passwordInput.value = '';
            }
        });
    }

    // Handle "Forgot Password" link
    const forgotPasswordLink = document.querySelector('a[href="reset-password.html"]');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'reset-password.html';
        });
    }
});