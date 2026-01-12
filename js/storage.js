/**
 * Storage Module for Roommate Expense Tracker
 * Handles all data persistence using localStorage
 */

const Storage = (function () {
    // Storage keys
    const STORAGE_KEYS = {
        MEMBERS: 'roommate_expenses_members',
        EXPENSES: 'roommate_expenses_data',
        PRESENCE: 'roommate_expenses_presence',
        SETTINGS: 'roommate_expenses_settings',
        LOCKED_MONTHS: 'roommate_expenses_locked_months',
        BACKUP: 'roommate_expenses_backup'
    };

    // Default settings
    const DEFAULT_SETTINGS = {
        theme: 'auto',
        compactView: false,
        currency: '₹',
        decimalPlaces: 2,
        dateFormat: 'dd/mm/yyyy',
        pinEnabled: false,
        autoBackup: false,
        backupFrequency: 24,
        dataRetention: 365,
        notifications: true,
        vibration: true,
        sound: true,
        lastBackup: null
    };

    // Initialize storage
    function init() {
        // Initialize empty data structures if they don't exist
        if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
            localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify({}));
        }

        if (!localStorage.getItem(STORAGE_KEYS.PRESENCE)) {
            localStorage.setItem(STORAGE_KEYS.PRESENCE, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        }

        if (!localStorage.getItem(STORAGE_KEYS.LOCKED_MONTHS)) {
            localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify([]));
        }

        console.log('Storage initialized');
    }

    // Member Management
    function getMembers() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS)) || [];
        } catch (error) {
            console.error('Error parsing members:', error);
            return [];
        }
    }

    function addMember(member) {
        try {
            const members = getMembers();
            const newMember = {
                id: generateId(),
                name: member.name,
                color: member.color || '#3B82F6',
                avatar: member.avatar || member.name.charAt(0),
                email: member.email || '',
                phone: member.phone || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            members.push(newMember);
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
            return newMember;
        } catch (error) {
            console.error('Error adding member:', error);
            throw error;
        }
    }

    function updateMember(memberId, updates) {
        try {
            const members = getMembers();
            const index = members.findIndex(m => m.id === memberId);

            if (index === -1) {
                throw new Error('Member not found');
            }

            members[index] = {
                ...members[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
            return members[index];
        } catch (error) {
            console.error('Error updating member:', error);
            throw error;
        }
    }

    function deleteMember(memberId) {
        try {
            // Check if member has expenses
            const expenses = getExpenses();
            let hasExpenses = false;

            Object.values(expenses).forEach(monthExpenses => {
                monthExpenses.forEach(expense => {
                    if (expense.paidBy === memberId ||
                        (expense.splitBetween && expense.splitBetween.includes(memberId))) {
                        hasExpenses = true;
                    }
                });
            });

            if (hasExpenses) {
                throw new Error('Cannot delete member with existing expenses');
            }

            // Delete member
            const members = getMembers();
            const filteredMembers = members.filter(m => m.id !== memberId);
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filteredMembers));

            // Also remove from presence records
            const presenceRecords = getPresenceRecords();
            const filteredPresence = presenceRecords.filter(record => record.memberId !== memberId);
            localStorage.setItem(STORAGE_KEYS.PRESENCE, JSON.stringify(filteredPresence));

            return true;
        } catch (error) {
            console.error('Error deleting member:', error);
            throw error;
        }
    }

    // Expense Management
    function getExpenses(monthKey = null) {
        try {
            const allExpenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES)) || {};

            if (monthKey) {
                return allExpenses[monthKey] || [];
            }

            return allExpenses;
        } catch (error) {
            console.error('Error parsing expenses:', error);
            return monthKey ? [] : {};
        }
    }

    function saveExpense(expense) {
        try {
            // Validate expense
            if (!expense.title || !expense.amount || !expense.paidBy || !expense.splitBetween) {
                throw new Error('Missing required expense fields');
            }

            const allExpenses = getExpenses();
            const expenseDate = new Date(expense.date || expense.createdAt);
            const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;

            // Check if month is locked
            const lockedMonths = getLockedMonths();
            if (lockedMonths.includes(monthKey)) {
                throw new Error(`Month ${monthKey} is locked and cannot be modified`);
            }

            // Create new expense
            const newExpense = {
                id: generateId(),
                title: expense.title,
                amount: parseFloat(expense.amount),
                paidBy: expense.paidBy,
                splitType: expense.splitType || 'equal',
                splitBetween: expense.splitBetween,
                splitDetails: expense.splitDetails || {},
                category: expense.category || 'Other',
                date: expense.date || new Date().toISOString().split('T')[0],
                notes: expense.notes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Initialize month array if it doesn't exist
            if (!allExpenses[monthKey]) {
                allExpenses[monthKey] = [];
            }

            allExpenses[monthKey].push(newExpense);
            localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(allExpenses));

            return newExpense;
        } catch (error) {
            console.error('Error saving expense:', error);
            throw error;
        }
    }

    function updateExpense(expenseId, updates) {
        try {
            const allExpenses = getExpenses();
            let updatedExpense = null;

            // Find and update the expense
            for (const monthKey in allExpenses) {
                const index = allExpenses[monthKey].findIndex(e => e.id === expenseId);
                if (index !== -1) {
                    // Check if month is locked
                    const lockedMonths = getLockedMonths();
                    if (lockedMonths.includes(monthKey)) {
                        throw new Error(`Month ${monthKey} is locked and cannot be modified`);
                    }

                    allExpenses[monthKey][index] = {
                        ...allExpenses[monthKey][index],
                        ...updates,
                        updatedAt: new Date().toISOString()
                    };

                    updatedExpense = allExpenses[monthKey][index];
                    break;
                }
            }

            if (!updatedExpense) {
                throw new Error('Expense not found');
            }

            localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(allExpenses));
            return updatedExpense;
        } catch (error) {
            console.error('Error updating expense:', error);
            throw error;
        }
    }

    function deleteExpense(expenseId) {
        try {
            const allExpenses = getExpenses();
            let deleted = false;

            for (const monthKey in allExpenses) {
                const index = allExpenses[monthKey].findIndex(e => e.id === expenseId);
                if (index !== -1) {
                    // Check if month is locked
                    const lockedMonths = getLockedMonths();
                    if (lockedMonths.includes(monthKey)) {
                        throw new Error(`Month ${monthKey} is locked and cannot be modified`);
                    }

                    allExpenses[monthKey].splice(index, 1);

                    // Remove month if empty
                    if (allExpenses[monthKey].length === 0) {
                        delete allExpenses[monthKey];
                    }

                    deleted = true;
                    break;
                }
            }

            if (!deleted) {
                throw new Error('Expense not found');
            }

            localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(allExpenses));
            return true;
        } catch (error) {
            console.error('Error deleting expense:', error);
            throw error;
        }
    }

    // Presence Management
    function getPresenceRecords() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRESENCE)) || [];
        } catch (error) {
            console.error('Error parsing presence records:', error);
            return [];
        }
    }

    function savePresenceRecord(record) {
        try {
            const records = getPresenceRecords();
            const newRecord = {
                id: record.id || generateId(),
                memberId: record.memberId,
                startDate: record.startDate,
                endDate: record.endDate || record.startDate,
                reason: record.reason,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Check for overlapping records
            const overlapping = records.filter(r =>
                r.memberId === newRecord.memberId &&
                !(new Date(newRecord.endDate) < new Date(r.startDate) ||
                    new Date(newRecord.startDate) > new Date(r.endDate))
            );

            if (overlapping.length > 0) {
                throw new Error('Overlapping absence records found');
            }

            // Update or add
            const index = records.findIndex(r => r.id === newRecord.id);
            if (index !== -1) {
                records[index] = newRecord;
            } else {
                records.push(newRecord);
            }

            localStorage.setItem(STORAGE_KEYS.PRESENCE, JSON.stringify(records));
            return newRecord;
        } catch (error) {
            console.error('Error saving presence record:', error);
            throw error;
        }
    }

    function deletePresenceRecord(recordId) {
        try {
            const records = getPresenceRecords();
            const filteredRecords = records.filter(r => r.id !== recordId);
            localStorage.setItem(STORAGE_KEYS.PRESENCE, JSON.stringify(filteredRecords));
            return true;
        } catch (error) {
            console.error('Error deleting presence record:', error);
            throw error;
        }
    }

    // Settings Management
    function getSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {};
            return { ...DEFAULT_SETTINGS, ...settings };
        } catch (error) {
            console.error('Error parsing settings:', error);
            return DEFAULT_SETTINGS;
        }
    }

    function saveSettings(settings) {
        try {
            const currentSettings = getSettings();
            const updatedSettings = {
                ...currentSettings,
                ...settings,
                lastUpdated: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
            return updatedSettings;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    // Month Locking
    function getLockedMonths() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCKED_MONTHS)) || [];
        } catch (error) {
            console.error('Error parsing locked months:', error);
            return [];
        }
    }

    function lockMonth(monthKey) {
        try {
            const lockedMonths = getLockedMonths();
            if (!lockedMonths.includes(monthKey)) {
                lockedMonths.push(monthKey);
                localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify(lockedMonths));
            }
            return lockedMonths;
        } catch (error) {
            console.error('Error locking month:', error);
            throw error;
        }
    }

    function unlockMonth(monthKey) {
        try {
            const lockedMonths = getLockedMonths();
            const filteredMonths = lockedMonths.filter(m => m !== monthKey);
            localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify(filteredMonths));
            return filteredMonths;
        } catch (error) {
            console.error('Error unlocking month:', error);
            throw error;
        }
    }

    // Backup and Export
    function exportData(format = 'json') {
        try {
            const data = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                members: getMembers(),
                expenses: getExpenses(),
                presence: getPresenceRecords(),
                settings: getSettings(),
                lockedMonths: getLockedMonths()
            };

            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            } else if (format === 'csv') {
                // Convert to CSV format (simplified)
                return convertToCSV(data);
            }

            return data;
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    function importData(data, format = 'json') {
        try {
            let importedData;

            if (format === 'json') {
                importedData = JSON.parse(data);
            } else {
                throw new Error('Unsupported format');
            }

            // Validate data structure
            if (!importedData.version || !importedData.members || !importedData.expenses) {
                throw new Error('Invalid data format');
            }

            // Backup current data
            const backup = exportData();
            localStorage.setItem(STORAGE_KEYS.BACKUP, backup);

            // Import new data
            if (importedData.members) {
                localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(importedData.members));
            }

            if (importedData.expenses) {
                localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(importedData.expenses));
            }

            if (importedData.presence) {
                localStorage.setItem(STORAGE_KEYS.PRESENCE, JSON.stringify(importedData.presence));
            }

            if (importedData.settings) {
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(importedData.settings));
            }

            if (importedData.lockedMonths) {
                localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify(importedData.lockedMonths));
            }

            return true;
        } catch (error) {
            console.error('Error importing data:', error);

            // Restore from backup if available
            const backup = localStorage.getItem(STORAGE_KEYS.BACKUP);
            if (backup) {
                try {
                    importData(backup);
                } catch (backupError) {
                    console.error('Failed to restore from backup:', backupError);
                }
            }

            throw error;
        }
    }

    // Clear all data
    function clearAllData() {
        try {
            localStorage.removeItem(STORAGE_KEYS.MEMBERS);
            localStorage.removeItem(STORAGE_KEYS.EXPENSES);
            localStorage.removeItem(STORAGE_KEYS.PRESENCE);
            localStorage.removeItem(STORAGE_KEYS.SETTINGS);
            localStorage.removeItem(STORAGE_KEYS.LOCKED_MONTHS);

            // Reinitialize
            init();

            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    // Utility functions
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function convertToCSV(data) {
        // Simplified CSV conversion
        let csv = '';

        // Members
        csv += 'Members\n';
        csv += 'ID,Name,Color,Avatar,Email,Phone,CreatedAt\n';
        data.members.forEach(member => {
            csv += `${member.id},${member.name},${member.color},${member.avatar},${member.email},${member.phone},${member.createdAt}\n`;
        });

        csv += '\n\nExpenses\n';
        csv += 'ID,Title,Amount,PaidBy,Category,Date,SplitType\n';

        // Expenses (flattened)
        Object.entries(data.expenses).forEach(([month, expenses]) => {
            expenses.forEach(expense => {
                csv += `${expense.id},${expense.title},${expense.amount},${expense.paidBy},${expense.category},${expense.date},${expense.splitType}\n`;
            });
        });

        return csv;
    }

    // Initialize on load
    init();

    // Public API
    return {
        // Members
        getMembers,
        addMember,
        updateMember,
        deleteMember,

        // Expenses
        getExpenses,
        saveExpense,
        updateExpense,
        deleteExpense,

        // Presence
        getPresenceRecords,
        savePresenceRecord,
        deletePresenceRecord,

        // Settings
        getSettings,
        saveSettings,

        // Month Locking
        getLockedMonths,
        lockMonth,
        unlockMonth,

        // Backup & Export
        exportData,
        importData,
        clearAllData
    };
})();

// Make available globally
window.storage = Storage;