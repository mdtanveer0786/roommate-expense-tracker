/**
 * Main Application Module for Roommate Expense Tracker
 * Initializes and coordinates all modules
 */

const App = (function () {
    // App state
    const state = {
        initialized: false,
        currentMonth: getCurrentMonthKey(),
        members: [],
        expenses: {},
        settings: {},
        isLoading: false
    };

    // Initialize application
    function init() {
        if (state.initialized) {
            console.log('App already initialized');
            return;
        }

        try {
            console.log('Initializing Roommate Expense Tracker...');

            // Initialize storage
            if (!window.storage) {
                console.error('Storage module not found');
                return;
            }

            // Load initial data
            loadInitialData();

            // Initialize UI
            if (window.UI) {
                window.UI.initTheme();
            }

            // Initialize event listeners
            initEventListeners();

            // Initialize service worker for PWA
            initServiceWorker();

            state.initialized = true;
            console.log('App initialized successfully');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            showError('Failed to initialize application. Please refresh the page.');
        }
    }

    // Load initial data
    function loadInitialData() {
        try {
            state.isLoading = true;

            // Load data from storage
            state.members = window.storage.getMembers();
            state.expenses = window.storage.getExpenses();
            state.settings = window.storage.getSettings();

            console.log(`Loaded ${state.members.length} members`);
            console.log(`Loaded expenses for ${Object.keys(state.expenses).length} months`);

            state.isLoading = false;

        } catch (error) {
            console.error('Error loading initial data:', error);
            state.isLoading = false;
            throw error;
        }
    }

    // Initialize event listeners
    function initEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (window.UI) {
                    window.UI.toggleTheme();
                }
            });
        }

        // Back button navigation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.back-button') ||
                (e.target.closest('a') && e.target.closest('a').classList.contains('back-button'))) {
                e.preventDefault();
                window.history.back();
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                e.preventDefault();
                handleFormSubmit(form);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const saveBtn = document.querySelector('#saveExpenseBtn, #saveMemberBtn, #saveSettingsBtn');
                if (saveBtn) {
                    saveBtn.click();
                }
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                if (window.UI) {
                    window.UI.closeAllModals();
                }
            }
        });

        // Online/offline detection
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOfflineStatus);

        // Page visibility
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Print functionality
        const printBtn = document.getElementById('printReportBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }

    // Handle form submissions
    function handleFormSubmit(form) {
        const formId = form.id;

        if (window.UI) {
            const validation = window.UI.validateForm(formId);
            if (!validation.isValid) {
                window.UI.showToast('Please fix the errors in the form', 'error');
                return;
            }
        }

        // Show loading
        if (window.UI) {
            window.UI.showLoading('Saving...');
        }

        // Process form based on ID
        switch (formId) {
            case 'expenseForm':
                handleExpenseForm(form);
                break;
            case 'memberForm':
                handleMemberForm(form);
                break;
            case 'absenceForm':
                handleAbsenceForm(form);
                break;
            case 'memberForm':
                handleMemberForm(form);
                break;
            default:
                console.warn(`Unhandled form: ${formId}`);
                if (window.UI) {
                    window.UI.hideLoading();
                }
        }
    }

    // Handle expense form
    function handleExpenseForm(form) {
        try {
            const formData = new FormData(form);
            const expenseData = {
                title: formData.get('expenseTitle') || '',
                amount: parseFloat(formData.get('expenseAmount')) || 0,
                paidBy: formData.get('paidBy') || '',
                splitType: form.querySelector('.split-type-btn.active')?.dataset.type || 'equal',
                splitBetween: Array.from(form.querySelectorAll('#splitBetweenContainer input:checked')).map(cb => cb.value),
                category: form.querySelector('#categoriesContainer .category-option.active')?.dataset.categoryId || 'other',
                date: formData.get('expenseDate') || new Date().toISOString().split('T')[0],
                notes: formData.get('expenseNotes') || ''
            };

            // Get split details based on split type
            if (expenseData.splitType === 'custom') {
                const customInputs = form.querySelectorAll('.custom-split-input');
                expenseData.splitDetails = {};
                customInputs.forEach(input => {
                    const memberId = input.dataset.memberId;
                    const amount = parseFloat(input.value) || 0;
                    if (memberId) {
                        expenseData.splitDetails[memberId] = amount;
                    }
                });
            } else if (expenseData.splitType === 'percentage') {
                const percentageInputs = form.querySelectorAll('.percentage-split-input');
                expenseData.splitDetails = {};
                percentageInputs.forEach(input => {
                    const memberId = input.dataset.memberId;
                    const percentage = parseFloat(input.value) || 0;
                    if (memberId) {
                        expenseData.splitDetails[memberId] = (expenseData.amount * percentage) / 100;
                    }
                });
            }

            // Save expense
            if (window.expenseModule) {
                window.expenseModule.add(expenseData);

                if (window.UI) {
                    window.UI.hideLoading();
                    window.UI.showToast('Expense saved successfully!', 'success');

                    // Redirect to dashboard after delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }
            }

        } catch (error) {
            console.error('Error handling expense form:', error);
            if (window.UI) {
                window.UI.hideLoading();
                window.UI.showToast(`Error: ${error.message}`, 'error');
            }
        }
    }

    // Handle member form
    function handleMemberForm(form) {
        try {
            const formData = new FormData(form);
            const memberId = formData.get('memberId');
            const memberData = {
                name: formData.get('memberName') || '',
                email: formData.get('memberEmail') || '',
                phone: formData.get('memberPhone') || '',
                color: form.querySelector('#colorPicker .color-option.active')?.dataset.color || '#3B82F6',
                avatar: form.querySelector('#avatarOptions .avatar-option.active')?.dataset.avatar || 'A'
            };

            if (memberId) {
                // Update existing member
                if (window.membersModule) {
                    window.membersModule.update(memberId, memberData);
                    if (window.UI) {
                        window.UI.showToast('Member updated successfully!', 'success');
                    }
                }
            } else {
                // Add new member
                if (window.membersModule) {
                    window.membersModule.add(memberData);
                    if (window.UI) {
                        window.UI.showToast('Member added successfully!', 'success');
                    }
                }
            }

            if (window.UI) {
                window.UI.hideLoading();
                window.UI.closeModal('memberModal');

                // Reload page if on members page
                if (window.location.pathname.includes('manage-members')) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            }

        } catch (error) {
            console.error('Error handling member form:', error);
            if (window.UI) {
                window.UI.hideLoading();
                window.UI.showToast(`Error: ${error.message}`, 'error');
            }
        }
    }

    // Handle absence form
    function handleAbsenceForm(form) {
        try {
            const formData = new FormData(form);
            const absenceId = formData.get('absenceId');
            const absenceData = {
                memberId: formData.get('absenceMember') || '',
                startDate: formData.get('absenceStartDate') || '',
                endDate: formData.get('absenceEndDate') || '',
                reason: formData.get('absenceReason') || ''
            };

            // Handle custom reason
            if (absenceData.reason === 'Other') {
                absenceData.reason = formData.get('customReason') || '';
            }

            if (absenceId) {
                // Update existing absence
                if (window.presenceModule) {
                    window.presenceModule.updateAbsence(absenceId, absenceData);
                    if (window.UI) {
                        window.UI.showToast('Absence updated successfully!', 'success');
                    }
                }
            } else {
                // Add new absence
                if (window.presenceModule) {
                    window.presenceModule.addAbsence(absenceData);
                    if (window.UI) {
                        window.UI.showToast('Absence recorded successfully!', 'success');
                    }
                }
            }

            if (window.UI) {
                window.UI.hideLoading();
                window.UI.closeModal('absenceModal');

                // Reload page if on presence page
                if (window.location.pathname.includes('manage-presence')) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            }

        } catch (error) {
            console.error('Error handling absence form:', error);
            if (window.UI) {
                window.UI.hideLoading();
                window.UI.showToast(`Error: ${error.message}`, 'error');
            }
        }
    }

    // Handle online status
    function handleOnlineStatus() {
        if (window.UI) {
            window.UI.showToast('You are back online', 'success');
        }

        // Sync data if needed
        syncData();
    }

    // Handle offline status
    function handleOfflineStatus() {
        if (window.UI) {
            window.UI.showToast('You are offline. Some features may be limited.', 'warning');
        }
    }

    // Handle page visibility change
    function handleVisibilityChange() {
        if (!document.hidden) {
            // Page became visible, refresh data
            refreshData();
        }
    }

    // Sync data (placeholder for future cloud sync)
    function syncData() {
        console.log('Syncing data...');
        // This would connect to a cloud service in a future version
    }

    // Refresh data
    function refreshData() {
        console.log('Refreshing data...');
        loadInitialData();

        // Update UI if on dashboard
        if (window.location.pathname.endsWith('index.html') ||
            window.location.pathname.endsWith('/')) {
            updateDashboard();
        }
    }

    // Update dashboard
    function updateDashboard() {
        // This would update the dashboard UI
        // Implementation depends on the specific dashboard page
        console.log('Updating dashboard...');
    }

    // Initialize service worker
    function initServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registered:', registration);

                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New update available
                                    if (window.UI) {
                                        window.UI.showToast('New version available. Refresh to update.', 'info');
                                    }
                                }
                            });
                        });
                    })
                    .catch(error => {
                        console.error('ServiceWorker registration failed:', error);
                    });
            });
        }
    }

    // Show error message
    function showError(message) {
        console.error('App error:', message);

        if (window.UI) {
            window.UI.showToast(message, 'error');
        } else {
            alert(`Error: ${message}`);
        }
    }

    // Get current month key
    function getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Get app state
    function getState() {
        return { ...state };
    }

    // Reset app
    function reset() {
        state.initialized = false;
        state.members = [];
        state.expenses = {};
        state.settings = {};
        state.isLoading = false;

        console.log('App reset');
    }

    // Public API
    return {
        init,
        getState,
        reset,
        refreshData,
        syncData
    };
})();

// Make available globally
window.App = App;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Small delay to ensure all elements are loaded
    setTimeout(() => {
        if (window.App) {
            window.App.init();
        }
    }, 100);
});

// Export function for inline scripts
window.initApp = function () {
    if (window.App) {
        window.App.init();
    }
};