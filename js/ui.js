/**
 * UI Module for Roommate Expense Tracker
 * Handles common UI interactions and utilities
 */

const UI = (function () {
    // Toast notification system
    const toastQueue = [];
    let isShowingToast = false;

    // Show toast notification
    function showToast(message, type = 'info', duration = 3000) {
        const toast = {
            message,
            type,
            duration,
            id: Date.now()
        };

        toastQueue.push(toast);
        processToastQueue();
    }

    // Process toast queue
    function processToastQueue() {
        if (isShowingToast || toastQueue.length === 0) {
            return;
        }

        isShowingToast = true;
        const toast = toastQueue.shift();
        displayToast(toast);
    }

    // Display a toast
    function displayToast(toast) {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toastElement = document.createElement('div');
        toastElement.className = `toast ${toast.type}`;
        toastElement.innerHTML = `
            <div class="toast-content">
                <div class="toast-message">${toast.message}</div>
            </div>
            <button class="toast-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

        container.appendChild(toastElement);

        // Animate in
        setTimeout(() => {
            toastElement.style.opacity = '1';
            toastElement.style.transform = 'translateY(0)';
        }, 10);

        // Close button
        const closeBtn = toastElement.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            removeToast(toastElement);
        });

        // Auto remove
        setTimeout(() => {
            if (toastElement.parentNode) {
                removeToast(toastElement);
            }
        }, toast.duration);
    }

    // Remove toast
    function removeToast(toastElement) {
        toastElement.style.opacity = '0';
        toastElement.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
            isShowingToast = false;
            processToastQueue();
        }, 300);
    }

    // Modal system
    const modalStack = [];

    // Show modal
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modalOverlay');

        if (!modal || !overlay) {
            console.error(`Modal ${modalId} or overlay not found`);
            return;
        }

        // Add to stack
        modalStack.push(modalId);

        // Show modal and overlay
        modal.style.display = 'block';
        overlay.style.display = 'block';

        // Animate in
        setTimeout(() => {
            modal.classList.add('active');
            overlay.classList.add('active');
        }, 10);

        // Trap focus inside modal
        trapFocus(modal);
    }

    // Close modal
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modalOverlay');

        if (!modal) return;

        // Remove from stack
        const index = modalStack.indexOf(modalId);
        if (index > -1) {
            modalStack.splice(index, 1);
        }

        // Animate out
        modal.classList.remove('active');

        setTimeout(() => {
            modal.style.display = 'none';

            // Hide overlay if no modals are open
            if (modalStack.length === 0 && overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
            }
        }, 300);

        // Restore focus
        restoreFocus();
    }

    // Close all modals
    function closeAllModals() {
        const overlay = document.getElementById('modalOverlay');

        // Close all modals in stack
        while (modalStack.length > 0) {
            const modalId = modalStack.pop();
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        }

        // Hide overlay
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
        }

        // Restore focus
        restoreFocus();
    }

    // Trap focus inside modal
    function trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Store current focused element
        window.previousFocus = document.activeElement;

        // Focus first element
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Handle tab key
        modal.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            } else if (e.key === 'Escape') {
                closeModal(modal.id);
            }
        });
    }

    // Restore focus
    function restoreFocus() {
        if (window.previousFocus) {
            window.previousFocus.focus();
            delete window.previousFocus;
        }
    }

    // Confirm dialog
    function showConfirm(options) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm',
                message = 'Are you sure?',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                type = 'warning'
            } = options;

            // Create modal HTML
            const modalId = 'confirmModal_' + Date.now();
            const modalHTML = `
                <div class="modal-overlay" id="${modalId}_overlay" style="display: block;"></div>
                <div class="modal" id="${modalId}" style="display: block;">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="icon-btn close-modal" onclick="UI.closeModal('${modalId}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="warning-message">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            <p>${message}</p>
                        </div>
                        <div class="modal-actions">
                            <button class="btn secondary-btn" id="${modalId}_cancel">${cancelText}</button>
                            <button class="btn ${type === 'danger' ? 'danger-btn' : 'primary-btn'}" id="${modalId}_confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

            // Add to document
            const container = document.createElement('div');
            container.innerHTML = modalHTML;
            document.body.appendChild(container);

            // Get modal elements
            const modal = document.getElementById(modalId);
            const overlay = document.getElementById(`${modalId}_overlay`);

            // Animate in
            setTimeout(() => {
                modal.classList.add('active');
                overlay.classList.add('active');
            }, 10);

            // Setup event listeners
            const confirmBtn = document.getElementById(`${modalId}_confirm`);
            const cancelBtn = document.getElementById(`${modalId}_cancel`);
            const closeBtn = modal.querySelector('.close-modal');

            const cleanup = () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    container.remove();
                }, 300);
            };

            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleCancel);

            // Trap focus
            trapFocus(modal);
        });
    }

    // Loading overlay
    function showLoading(message = 'Loading...') {
        // Create loading overlay if it doesn't exist
        let loading = document.getElementById('loadingOverlay');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loadingOverlay';
            loading.className = 'loading-overlay';
            loading.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                </div>
            `;
            document.body.appendChild(loading);

            // Add styles if not present
            if (!document.getElementById('loadingStyles')) {
                const styles = document.createElement('style');
                styles.id = 'loadingStyles';
                styles.textContent = `
                    .loading-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                    }
                    .loading-content {
                        background: var(--bg-primary);
                        padding: 2rem;
                        border-radius: var(--radius-lg);
                        text-align: center;
                        min-width: 200px;
                    }
                    .loading-spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid var(--border-color);
                        border-top-color: var(--primary-600);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem;
                    }
                    .loading-message {
                        color: var(--text-primary);
                        font-size: 0.875rem;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(styles);
            }
        }

        loading.style.display = 'flex';
    }

    function hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // Form validation
    function validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return { isValid: true, errors: [] };

        const inputs = form.querySelectorAll('[required], [data-validate]');
        const errors = [];

        inputs.forEach(input => {
            // Clear previous error
            input.classList.remove('error');
            const errorElement = document.getElementById(`${input.id}_error`);
            if (errorElement) {
                errorElement.remove();
            }

            // Validate required fields
            if (input.hasAttribute('required') && !input.value.trim()) {
                errors.push({
                    field: input.id,
                    message: `${input.getAttribute('data-label') || input.name} is required`
                });
                input.classList.add('error');
            }

            // Validate email
            if (input.type === 'email' && input.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    errors.push({
                        field: input.id,
                        message: 'Please enter a valid email address'
                    });
                    input.classList.add('error');
                }
            }

            // Validate number
            if (input.type === 'number' && input.value) {
                const min = parseFloat(input.getAttribute('min'));
                const max = parseFloat(input.getAttribute('max'));
                const value = parseFloat(input.value);

                if (!isNaN(min) && value < min) {
                    errors.push({
                        field: input.id,
                        message: `Value must be at least ${min}`
                    });
                    input.classList.add('error');
                }

                if (!isNaN(max) && value > max) {
                    errors.push({
                        field: input.id,
                        message: `Value must be at most ${max}`
                    });
                    input.classList.add('error');
                }
            }

            // Custom validation
            const validateRule = input.getAttribute('data-validate');
            if (validateRule && input.value) {
                switch (validateRule) {
                    case 'phone':
                        const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/;
                        if (!phoneRegex.test(input.value)) {
                            errors.push({
                                field: input.id,
                                message: 'Please enter a valid phone number'
                            });
                            input.classList.add('error');
                        }
                        break;
                }
            }
        });

        // Show errors
        errors.forEach(error => {
            const input = document.getElementById(error.field);
            if (input) {
                const errorElement = document.createElement('div');
                errorElement.id = `${input.id}_error`;
                errorElement.className = 'form-error';
                errorElement.textContent = error.message;
                errorElement.style.color = 'var(--danger-600)';
                errorElement.style.fontSize = '0.75rem';
                errorElement.style.marginTop = '0.25rem';

                input.parentNode.appendChild(errorElement);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Format currency
    function formatCurrency(amount) {
        const storage = window.storage;
        const settings = storage ? storage.getSettings() : null;
        const currency = settings?.currency || '₹';
        const decimalPlaces = settings?.decimalPlaces || 2;

        return `${currency}${parseFloat(amount).toFixed(decimalPlaces)}`;
    }

    // Format date
    function formatDate(dateString) {
        const storage = window.storage;
        const settings = storage ? storage.getSettings() : null;
        const dateFormat = settings?.dateFormat || 'dd/mm/yyyy';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[date.getMonth()];

        switch (dateFormat) {
            case 'dd/mm/yyyy':
                return `${day}/${month}/${year}`;
            case 'mm/dd/yyyy':
                return `${month}/${day}/${year}`;
            case 'yyyy-mm-dd':
                return `${year}-${month}-${day}`;
            case 'dd mmm yyyy':
                return `${day} ${monthName} ${year}`;
            default:
                return date.toLocaleDateString();
        }
    }

    // Copy to clipboard
    function copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            // Create temporary textarea
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);

            // Select and copy
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile devices

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);

                if (successful) {
                    resolve(true);
                } else {
                    reject(new Error('Copy failed'));
                }
            } catch (err) {
                document.body.removeChild(textarea);
                reject(err);
            }
        });
    }

    // Download file
    function downloadFile(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    function throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Toggle theme
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        let newTheme;

        if (currentTheme === 'dark') {
            newTheme = 'light';
        } else if (currentTheme === 'light') {
            newTheme = 'dark';
        } else {
            // Auto mode - detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            newTheme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', newTheme);

        // Save preference
        const storage = window.storage;
        if (storage) {
            const settings = storage.getSettings();
            storage.saveSettings({ ...settings, theme: newTheme });
        }

        return newTheme;
    }

    // Initialize theme
    function initTheme() {
        const storage = window.storage;
        if (!storage) return;

        const settings = storage.getSettings();
        const theme = settings?.theme || 'auto';

        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    // Public API
    return {
        showToast,
        showModal,
        closeModal,
        closeAllModals,
        showConfirm,
        showLoading,
        hideLoading,
        validateForm,
        formatCurrency,
        formatDate,
        copyToClipboard,
        downloadFile,
        debounce,
        throttle,
        toggleTheme,
        initTheme
    };
})();

// Make available globally
window.UI = UI;

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (window.UI) {
        window.UI.initTheme();
    }
});