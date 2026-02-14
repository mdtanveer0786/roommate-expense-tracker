/**
 * Utilities Module for Roommate Expense Tracker
 * Helper functions for data export, formatting, and validation
 */

const Utils = (function () {
    /**
     * Format currency value
     */
    function formatCurrency(amount, currency = '₹', decimalPlaces = 2) {
        try {
            const formatted = parseFloat(amount).toFixed(decimalPlaces);
            return `${currency}${formatted}`;
        } catch (error) {
            return `${currency}0.00`;
        }
    }

    /**
     * Format date for display
     */
    function formatDate(dateString, format = 'dd/mm/yyyy') {
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            const formats = {
                'dd/mm/yyyy': `${day}/${month}/${year}`,
                'mm/dd/yyyy': `${month}/${day}/${year}`,
                'yyyy-mm-dd': `${year}-${month}-${day}`,
                'short': date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit'
                })
            };

            return formats[format] || formats['dd/mm/yyyy'];
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Export expenses to CSV
     */
    function exportToCSV(expenses, fileName = 'roommate-expenses.csv') {
        try {
            if (!Array.isArray(expenses) || expenses.length === 0) {
                throw new Error('No expenses to export');
            }

            // CSV headers
            const headers = ['Date', 'Title', 'Category', 'Amount', 'Paid By', 'Split Between', 'Description'];

            // Get members for name lookup
            const storage = window.storage;
            const members = storage ? storage.getMembers() : [];
            const memberMap = {};
            members.forEach(m => memberMap[m.id] = m.name);

            // Create CSV rows
            const rows = expenses.map(expense => {
                const participants = Array.isArray(expense.splitBetween)
                    ? expense.splitBetween.map(id => memberMap[id] || id).join(', ')
                    : '';

                return [
                    formatDate(expense.date || expense.createdAt),
                    `"${expense.title || 'Untitled'}"`,
                    expense.category || 'Other',
                    expense.amount || 0,
                    memberMap[expense.paidBy] || 'Unknown',
                    `"${participants}"`,
                    `"${expense.description || ''}"`
                ].join(',');
            });

            // Combine headers and rows
            const csv = [headers.join(','), ...rows].join('\n');

            // Create blob and download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return true;
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            throw error;
        }
    }

    /**
     * Export data to JSON
     */
    function exportToJSON(data, fileName = 'roommate-expenses.json') {
        try {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return true;
        } catch (error) {
            console.error('Error exporting to JSON:', error);
            throw error;
        }
    }

    /**
     * Generate summary report
     */
    function generateSummaryReport(expenses, members) {
        try {
            const report = {
                generatedAt: new Date().toISOString(),
                totalExpenses: expenses.length,
                totalAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
                members: members.length,
                averagePerPerson: 0,
                byCategory: {},
                byMember: {}
            };

            // Calculate average
            if (members.length > 0) {
                report.averagePerPerson = report.totalAmount / members.length;
            }

            // Group by category
            expenses.forEach(expense => {
                const category = expense.category || 'Other';
                report.byCategory[category] = (report.byCategory[category] || 0) + expense.amount;
            });

            // Group by member (paid)
            expenses.forEach(expense => {
                const memberId = expense.paidBy;
                const member = members.find(m => m.id === memberId);
                const name = member ? member.name : 'Unknown';

                if (!report.byMember[name]) {
                    report.byMember[name] = {
                        paid: 0,
                        owes: 0,
                        share: 0
                    };
                }

                report.byMember[name].paid += expense.amount;

                // Calculate share
                const participants = expense.splitBetween || [];
                if (participants.length > 0) {
                    const split = expense.splitType === 'equal'
                        ? expense.amount / participants.length
                        : (expense.splitDetails && expense.splitDetails[memberId]) || 0;

                    report.byMember[name].share += split;
                }
            });

            // Calculate owes
            Object.keys(report.byMember).forEach(name => {
                report.byMember[name].owes = report.byMember[name].paid - report.byMember[name].share;
            });

            return report;
        } catch (error) {
            console.error('Error generating summary:', error);
            return null;
        }
    }

    /**
     * Validate email
     */
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate amount
     */
    function validateAmount(amount) {
        const num = parseFloat(amount);
        return !isNaN(num) && num >= 0;
    }

    /**
     * Validate date
     */
    function validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Get initials from name
     */
    function getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    /**
     * Generate random color
     */
    function generateColor() {
        const colors = [
            '#0ea5e9', // Cyan
            '#06b6d4', // Cyan-600
            '#0891b2', // Cyan-700
            '#f43f5e', // Rose
            '#ec4899', // Pink
            '#d946ef', // Fuchsia
            '#a855f7', // Purple
            '#7c3aed', // Violet
            '#6366f1', // Indigo
            '#8b5cf6', // Violet-500
            '#3b82f6', // Blue
            '#0284c7', // Sky
            '#10b981', // Emerald
            '#14b8a6', // Teal
            '#2563eb'  // Blue-600
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Debounce function
     */
    function debounce(fn, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /**
     * Throttle function
     */
    function throttle(fn, delay = 300) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                fn.apply(this, args);
            }
        };
    }

    /**
     * Copy text to clipboard
     */
    function copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';

                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                return Promise.resolve();
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Get browser storage capacity
     */
    function getStorageSize() {
        try {
            const test = '__STORAGE_TEST__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if device is mobile
     */
    function isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    }

    /**
     * Deep clone object
     */
    function deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('Error cloning object:', error);
            return obj;
        }
    }

    /**
     * Merge objects
     */
    function mergeObjects(target, source) {
        const result = deepClone(target);
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = mergeObjects(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public API
    return {
        formatCurrency,
        formatDate,
        exportToCSV,
        exportToJSON,
        generateSummaryReport,
        validateEmail,
        validateAmount,
        validateDate,
        getInitials,
        generateColor,
        debounce,
        throttle,
        copyToClipboard,
        getStorageSize,
        isMobileDevice,
        deepClone,
        mergeObjects,
        generateId
    };
})();

// Make Utils available globally
window.Utils = Utils;
