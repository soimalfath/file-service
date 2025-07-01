/**
 * Login Page JavaScript
 * Handles user authentication functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitButton = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    const showPasswordBtn = document.getElementById('togglePassword');
    const showPasswordIcon = showPasswordBtn ? showPasswordBtn.querySelector('i') : null;

    // Check if user is already authenticated
    async function checkAuth() {
        try {
            const response = await fetch('/auth/status', { credentials: 'include' });
            const data = await response.json();
            const isAuthenticated = data && ((data.data && data.data.authenticated) || data.user);
            
            if (response.ok && data.success && isAuthenticated) {
                window.location.href = '/';
                return true;
            }
            
            // Try refresh if not authenticated
            const refreshResp = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
            if (refreshResp.ok) {
                // Try status again
                const statusResp = await fetch('/auth/status', { credentials: 'include' });
                if (statusResp.ok) {
                    const statusData = await statusResp.json();
                    const isAuthAfterRefresh = statusData && ((statusData.data && statusData.data.authenticated) || statusData.user);
                    if (statusData.success && isAuthAfterRefresh) {
                        window.location.href = '/';
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    // Handle form submission
    async function handleLogin(e) {
        e.preventDefault();
        
        // Check if elements exist
        if (!usernameInput || !passwordInput) {
            showToast('Form elements not found', 'error');
            return;
        }
        
        // Validate inputs
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!username || !password) {
            showToast('Username dan password harus diisi', 'error');
            return;
        }
        
        // Show loading state
        setLoading(true);
        
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Simpan data user ke localStorage
                const userData = {
                    authenticated: true,
                    username: data.data.username
                };
                localStorage.setItem('userData', JSON.stringify(userData));
                showToast('Login berhasil!', 'success');
                setTimeout(() => window.location.href = '/', 1000);
            } else {
                throw new Error(data.error || 'Username atau password salah');
            }
        } catch (error) {
            showToast(error.message, 'error');
            setLoading(false);
        }
    }
    
    // Toggle password visibility
    function togglePasswordVisibility() {
        if (!passwordInput || !showPasswordIcon) return;
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            showPasswordIcon.classList.remove('fa-eye');
            showPasswordIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            showPasswordIcon.classList.remove('fa-eye-slash');
            showPasswordIcon.classList.add('fa-eye');
        }
    }
    
    // Set loading state
    function setLoading(isLoading) {
        if (!submitButton || !spinner) return;
        
        if (isLoading) {
            submitButton.disabled = true;
            spinner.classList.remove('hidden');
            const btnText = submitButton.querySelector('#loginBtnText');
            if (btnText) btnText.classList.add('opacity-0');
        } else {
            submitButton.disabled = false;
            spinner.classList.add('hidden');
            const btnText = submitButton.querySelector('#loginBtnText');
            if (btnText) btnText.classList.remove('opacity-0');
        }
    }
    
    // Show toast notification
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        const icons = { 
            success: 'fa-check-circle', 
            error: 'fa-times-circle', 
            warning: 'fa-exclamation-triangle', 
            info: 'fa-info-circle' 
        };
        const colors = { 
            success: 'bg-green-500', 
            error: 'bg-red-500', 
            warning: 'bg-yellow-500', 
            info: 'bg-blue-500' 
        };
        
        toast.className = `toast px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium max-w-sm ${colors[type]}`;
        toast.innerHTML = `<div class="flex items-center gap-3"><i class="fas ${icons[type]} text-lg"></i><span>${message}</span></div>`;
        
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
    
    // Initialize event listeners
    function init() {
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        if (showPasswordBtn) {
            showPasswordBtn.addEventListener('click', togglePasswordVisibility);
        }
        
        checkAuth();
    }
    
    init();
});