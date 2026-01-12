/**
 * PWA (Progressive Web App) Module for Roommate Expense Tracker
 * Handles PWA installation and offline capabilities
 */

const PWA = (function () {
    // Deferred prompt for install
    let deferredPrompt;

    // Initialize PWA features
    function init() {
        // Check if PWA is supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('PWA features not supported in this browser');
            return;
        }

        // Handle before install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('beforeinstallprompt fired');

            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();

            // Stash the event so it can be triggered later
            deferredPrompt = e;

            // Show install button if not already installed
            if (!isInstalled()) {
                showInstallButton();
            }
        });

        // Handle app installed
        window.addEventListener('appinstalled', (e) => {
            console.log('App installed successfully');
            deferredPrompt = null;
            hideInstallButton();

            // Show success message
            if (window.UI) {
                window.UI.showToast('App installed successfully!', 'success');
            }
        });

        // Check installation status on load
        if (isInstalled()) {
            console.log('App is installed');
        }

        // Initialize service worker
        initServiceWorker();

        // Initialize periodic sync (if supported)
        initPeriodicSync();
    }

    // Show install button
    function showInstallButton() {
        // Check if we're already showing a button
        let installBtn = document.getElementById('pwaInstallButton');
        if (installBtn) {
            return;
        }

        // Create install button
        installBtn = document.createElement('button');
        installBtn.id = 'pwaInstallButton';
        installBtn.className = 'pwa-install-btn';
        installBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span>Install App</span>
        `;

        // Add styles
        if (!document.getElementById('pwaStyles')) {
            const styles = document.createElement('style');
            styles.id = 'pwaStyles';
            styles.textContent = `
                .pwa-install-btn {
                    position: fixed;
                    bottom: 5rem;
                    right: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: var(--primary-600);
                    color: white;
                    border: none;
                    border-radius: var(--radius-full);
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    z-index: 999;
                    box-shadow: var(--shadow-lg);
                    transition: all 0.2s ease;
                }
                .pwa-install-btn:hover {
                    background: var(--primary-700);
                    transform: translateY(-2px);
                }
                .pwa-install-btn:active {
                    transform: translateY(0);
                }
                @media (max-width: 768px) {
                    .pwa-install-btn {
                        bottom: 6rem;
                        right: 0.5rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add click event
        installBtn.addEventListener('click', promptInstall);

        // Add to document
        document.body.appendChild(installBtn);
    }

    // Hide install button
    function hideInstallButton() {
        const installBtn = document.getElementById('pwaInstallButton');
        if (installBtn) {
            installBtn.remove();
        }
    }

    // Prompt user to install
    function promptInstall() {
        if (!deferredPrompt) {
            console.log('No install prompt available');
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }

            // Clear the saved prompt
            deferredPrompt = null;

            // Hide the install button
            hideInstallButton();
        });
    }

    // Check if app is installed
    function isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true ||
            document.referrer.includes('android-app://');
    }

    // Initialize service worker
    function initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration);

                    // Check for updates every hour
                    setInterval(() => {
                        registration.update();
                    }, 60 * 60 * 1000);
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }

    // Initialize periodic background sync
    function initPeriodicSync() {
        if ('periodicSync' in window && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                // Register for periodic sync (once per day)
                registration.periodicSync.register('data-sync', {
                    minInterval: 24 * 60 * 60 * 1000 // 24 hours
                }).then(() => {
                    console.log('Periodic sync registered');
                }).catch((error) => {
                    console.log('Periodic sync could not be registered:', error);
                });
            });
        }
    }

    // Check for updates
    function checkForUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration) {
                    registration.update();
                }
            });
        }
    }

    // Request notification permission
    function requestNotificationPermission() {
        return new Promise((resolve, reject) => {
            if (!('Notification' in window)) {
                reject(new Error('Notifications not supported'));
                return;
            }

            if (Notification.permission === 'granted') {
                resolve(true);
            } else if (Notification.permission === 'denied') {
                reject(new Error('Notifications blocked'));
            } else {
                Notification.requestPermission().then((permission) => {
                    if (permission === 'granted') {
                        resolve(true);
                    } else {
                        reject(new Error('Permission denied'));
                    }
                });
            }
        });
    }

    // Show notification
    function showNotification(title, options = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return false;
        }

        const notificationOptions = {
            body: options.body || '',
            icon: options.icon || '/icon-192.png',
            badge: options.badge || '/icon-96.png',
            tag: options.tag || 'expense-tracker',
            renotify: options.renotify || true,
            silent: options.silent || false,
            requireInteraction: options.requireInteraction || false,
            data: options.data || {},
            ...options
        };

        if (navigator.serviceWorker) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, notificationOptions);
            });
        } else {
            new Notification(title, notificationOptions);
        }

        return true;
    }

    // Send push notification
    function sendPushNotification(title, body, data = {}) {
        if (!('PushManager' in window)) {
            console.log('Push notifications not supported');
            return false;
        }

        return showNotification(title, {
            body: body,
            data: data,
            actions: [
                {
                    action: 'view',
                    title: 'View'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        });
    }

    // Get device storage info
    async function getStorageInfo() {
        if (!navigator.storage) {
            return null;
        }

        try {
            const estimate = await navigator.storage.estimate();
            const usage = (estimate.usage / (1024 * 1024)).toFixed(2); // MB
            const quota = (estimate.quota / (1024 * 1024)).toFixed(2); // MB
            const percentage = ((estimate.usage / estimate.quota) * 100).toFixed(1);

            return {
                usage: parseFloat(usage),
                quota: parseFloat(quota),
                percentage: parseFloat(percentage),
                estimate: estimate
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }

    // Clear app cache
    async function clearCache() {
        if (!('caches' in window)) {
            return false;
        }

        try {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );

            console.log('Cache cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }

    // Check connectivity
    function isOnline() {
        return navigator.onLine;
    }

    // Add connectivity listeners
    function addConnectivityListener(callback) {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
    }

    // Get device info
    function getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            online: navigator.onLine,
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            pdfViewerEnabled: navigator.pdfViewerEnabled || false
        };
    }

    // Share content
    async function shareContent(title, text, url) {
        if (!navigator.share) {
            console.log('Web Share API not supported');
            return false;
        }

        try {
            await navigator.share({
                title: title,
                text: text,
                url: url || window.location.href
            });
            return true;
        } catch (error) {
            console.error('Error sharing:', error);
            return false;
        }
    }

    // Add to home screen info
    function showAddToHomeScreenInfo() {
        if (isInstalled() || !deferredPrompt) {
            return;
        }

        if (window.UI) {
            window.UI.showConfirm({
                title: 'Install App',
                message: 'Install this app on your home screen for quick access and offline use.',
                confirmText: 'Install',
                cancelText: 'Later'
            }).then((confirmed) => {
                if (confirmed) {
                    promptInstall();
                }
            });
        }
    }

    // Public API
    return {
        init,
        promptInstall,
        isInstalled,
        checkForUpdates,
        requestNotificationPermission,
        showNotification,
        sendPushNotification,
        getStorageInfo,
        clearCache,
        isOnline,
        addConnectivityListener,
        getDeviceInfo,
        shareContent,
        showAddToHomeScreenInfo
    };
})();

// Make available globally
window.PWA = PWA;

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (window.PWA) {
        window.PWA.init();
    }
});