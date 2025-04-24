// Reset Password Page Script

document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const firstLogin = params.get('firstLogin') === 'true';

    const resetPasswordForm = document.getElementById('reset-password-form');
    const newPasswordForm = document.getElementById('new-password-form');
    const resetMessage = document.getElementById('reset-message');
    const passwordMessage = document.getElementById('password-message');

    // Handle email-based password reset request
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Reset message
            if (resetMessage) {
                resetMessage.textContent = '';
                resetMessage.classList.remove('hidden');
            }

            const emailInput = document.getElementById('email');
            const email = emailInput.value.trim();

            try {
                // Send reset request using the new API service
                await window.apiService.auth.resetPassword(email);

                // Show success message
                if (resetMessage) {
                    resetMessage.textContent = 'Password reset instructions have been sent to your email.';
                    resetMessage.classList.remove('hidden');
                }

                // Clear email input
                emailInput.value = '';
            } catch (error) {
                // Error handling is now managed in the API service
                // The error message will be shown via toast
                emailInput.value = '';
            }
        });
    }

    // Handle new password form (for first login or token-based reset)
    if (newPasswordForm) {
        // If it's first login or has a reset token, show the new password form
        if (firstLogin || token) {
            resetPasswordForm.classList.add('hidden');
            newPasswordForm.classList.remove('hidden');
        }

        newPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Reset message
            if (passwordMessage) {
                passwordMessage.textContent = '';
                passwordMessage.classList.remove('hidden');
            }

            const newPasswordInput = document.getElementById('new-password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validate password
            if (newPassword !== confirmPassword) {
                if (passwordMessage) {
                    passwordMessage.textContent = 'Passwords do not match';
                    passwordMessage.classList.remove('hidden');
                }
                return;
            }

            // Validate password length
            if (newPassword.length < 8) {
                if (passwordMessage) {
                    passwordMessage.textContent = 'Password must be at least 8 characters long';
                    passwordMessage.classList.remove('hidden');
                }
                return;
            }

            try {
                // For first login, use changePassword with null current password
                await window.apiService.auth.changePassword(
                    firstLogin ? null : undefined, 
                    newPassword
                );

                // Show success message
                if (passwordMessage) {
                    passwordMessage.textContent = 'Password updated successfully. Redirecting to login...';
                    passwordMessage.classList.remove('hidden');
                }

                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } catch (error) {
                // Error handling is now managed in the API service
                // The error message will be shown via toast

                // Clear password inputs
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
            }
        });
    }
});
