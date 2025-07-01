document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    // Ambil API_KEY dari endpoint backend agar selalu sinkron dengan env
    let DEFAULT_API_KEY = 'your-api-key-change-this';
    fetch('/api/apikey')
      .then(r => r.json())
      .then(d => {
        if (d.apiKey) DEFAULT_API_KEY = d.apiKey;
        else showToast('Gagal mengambil API key dari backend', 'error');
      })
     .catch(() => showToast('Gagal mengambil API key dari backend', 'error'));

    // DOM Elements
    const generateApiKeyBtn = document.getElementById('generateApiKeyBtn');
    const apiKeySection = document.getElementById('apiKeySection');
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
    const copyApiKeyBtn = document.getElementById('copyApiKeyBtn');
    const copyBaseUrlBtn = document.getElementById('copyBaseUrlBtn');
    const baseUrlElement = document.getElementById('baseUrl');

    let isApiKeySectionVisible = false;

    // --- Functions ---

    const showToast = (message, type = 'info') => {
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
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas ${icons[type]} text-lg"></i>
                <span>${message}</span>
            </div>
        `;

        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 4000);
    };
    
    const copyToClipboard = (text, successMessage) => {
        // Use the Clipboard API for modern browsers
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(successMessage, 'success');
            }).catch(err => {
                console.error('Copy failed:', err);
                showToast('Failed to copy to clipboard', 'error');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed"; // Avoid scrolling to bottom
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(successMessage, 'success');
            } catch (err) {
                console.error('Fallback copy failed:', err);
                showToast('Failed to copy to clipboard', 'error');
            }
            document.body.removeChild(textArea);
        }
    };
    

    const toggleApiKeySection = () => {
        isApiKeySectionVisible = !isApiKeySectionVisible;
        if (isApiKeySectionVisible) {
            apiKeySection.classList.remove('hidden');
            // Ambil API key terbaru dari backend jika belum ada
            if (!DEFAULT_API_KEY || DEFAULT_API_KEY === 'your-api-key-change-this') {
                fetch('/api/apikey').then(r => r.json()).then(d => {
                    apiKeyDisplay.value = d.apiKey || 'your-api-key-change-this';
                });
            } else {
                apiKeyDisplay.value = DEFAULT_API_KEY;
            }
            generateApiKeyBtn.querySelector('span').textContent = 'Hide API Key';
            showToast('API Key displayed. Keep it secure!', 'warning');
        } else {
            apiKeySection.classList.add('hidden');
            generateApiKeyBtn.querySelector('span').textContent = 'Show API Key';
        }
    };

    const toggleApiKeyVisibility = () => {
        const isVisible = apiKeyDisplay.type === 'text';
        apiKeyDisplay.type = isVisible ? 'password' : 'text';
        const icon = toggleApiKeyBtn.querySelector('i');
        icon.className = isVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
    };


    // --- Event Listeners ---

    if (generateApiKeyBtn) {
        generateApiKeyBtn.addEventListener('click', toggleApiKeySection);
    }

    if (toggleApiKeyBtn) {
        toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    }

    if (copyApiKeyBtn) {
        copyApiKeyBtn.addEventListener('click', () => {
           copyToClipboard(apiKeyDisplay.value, 'API Key copied to clipboard!');
        });
    }

    if (copyBaseUrlBtn) {
        copyBaseUrlBtn.addEventListener('click', () => {
            copyToClipboard(baseUrlElement.textContent.replace('Base URL: ', ''), 'Base URL copied to clipboard!');
        });
    }

    // --- Initial Setup ---

    if (baseUrlElement) {
        baseUrlElement.textContent = `${window.location.origin}/api`;
    }
});