/**
 * Members Module for Roommate Expense Tracker
 * Handles member-related operations
 */

const Members = (function () {
    // Get all members
    function getAll() {
        try {
            const storage = window.storage;
            return storage ? storage.getMembers() : [];
        } catch (error) {
            console.error('Error getting members:', error);
            return [];
        }
    }

    // Add a new member
    function add(memberData) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            // Validate member data
            if (!memberData.name || memberData.name.trim() === '') {
                throw new Error('Member name is required');
            }

            return storage.addMember(memberData);
        } catch (error) {
            console.error('Error adding member:', error);
            throw error;
        }
    }

    // Update an existing member
    function update(memberId, updates) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            return storage.updateMember(memberId, updates);
        } catch (error) {
            console.error('Error updating member:', error);
            throw error;
        }
    }

    // Delete a member
    function remove(memberId) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            return storage.deleteMember(memberId);
        } catch (error) {
            console.error('Error deleting member:', error);
            throw error;
        }
    }

    // Get member by ID
    function getById(memberId) {
        try {
            const members = getAll();
            return members.find(member => member.id === memberId) || null;
        } catch (error) {
            console.error('Error getting member by ID:', error);
            return null;
        }
    }

    // Get members present on a specific date
    function getPresentMembers(date) {
        try {
            const storage = window.storage;
            if (!storage) {
                return getAll();
            }

            const allMembers = getAll();
            const absenceRecords = storage.getPresenceRecords();
            const targetDate = new Date(date);

            // Filter out members who are absent on this date
            const presentMembers = allMembers.filter(member => {
                const isAbsent = absenceRecords.some(record => {
                    const startDate = new Date(record.startDate);
                    const endDate = record.endDate ? new Date(record.endDate) : startDate;

                    return record.memberId === member.id &&
                        targetDate >= startDate &&
                        targetDate <= endDate;
                });

                return !isAbsent;
            });

            return presentMembers;
        } catch (error) {
            console.error('Error getting present members:', error);
            return getAll();
        }
    }

    // Get member's total contributions
    function getMemberContributions(memberId) {
        try {
            const storage = window.storage;
            if (!storage) {
                return { paid: 0, owed: 0, net: 0 };
            }

            const expenses = storage.getExpenses();
            let paid = 0;
            let owed = 0;

            // Calculate total paid and owed
            Object.values(expenses).forEach(monthExpenses => {
                monthExpenses.forEach(expense => {
                    // Amount paid by this member
                    if (expense.paidBy === memberId) {
                        paid += expense.amount || 0;
                    }

                    // Amount owed by this member (from split)
                    if (expense.splitDetails && expense.splitDetails[memberId]) {
                        owed += expense.splitDetails[memberId] || 0;
                    } else if (expense.splitBetween && expense.splitBetween.includes(memberId)) {
                        // Equal split calculation
                        const participantCount = expense.splitBetween.length;
                        if (participantCount > 0) {
                            const share = expense.amount / participantCount;
                            owed += share;
                        }
                    }
                });
            });

            return {
                paid: parseFloat(paid.toFixed(2)),
                owed: parseFloat(owed.toFixed(2)),
                net: parseFloat((paid - owed).toFixed(2))
            };
        } catch (error) {
            console.error('Error calculating member contributions:', error);
            return { paid: 0, owed: 0, net: 0 };
        }
    }

    // Get member's balance history
    function getMemberBalanceHistory(memberId) {
        try {
            const storage = window.storage;
            if (!storage) {
                return [];
            }

            const expenses = storage.getExpenses();
            const balanceHistory = [];

            // Group expenses by month and calculate monthly balances
            Object.entries(expenses).forEach(([monthKey, monthExpenses]) => {
                let monthPaid = 0;
                let monthOwed = 0;

                monthExpenses.forEach(expense => {
                    // Amount paid by this member
                    if (expense.paidBy === memberId) {
                        monthPaid += expense.amount || 0;
                    }

                    // Amount owed by this member (from split)
                    if (expense.splitDetails && expense.splitDetails[memberId]) {
                        monthOwed += expense.splitDetails[memberId] || 0;
                    } else if (expense.splitBetween && expense.splitBetween.includes(memberId)) {
                        // Equal split calculation
                        const participantCount = expense.splitBetween.length;
                        if (participantCount > 0) {
                            const share = expense.amount / participantCount;
                            monthOwed += share;
                        }
                    }
                });

                const [year, month] = monthKey.split('-').map(Number);
                const monthNames = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ];

                balanceHistory.push({
                    month: monthKey,
                    monthName: `${monthNames[month - 1]} ${year}`,
                    paid: parseFloat(monthPaid.toFixed(2)),
                    owed: parseFloat(monthOwed.toFixed(2)),
                    net: parseFloat((monthPaid - monthOwed).toFixed(2))
                });
            });

            // Sort by month
            balanceHistory.sort((a, b) => a.month.localeCompare(b.month));

            return balanceHistory;
        } catch (error) {
            console.error('Error getting member balance history:', error);
            return [];
        }
    }

    // Validate member data
    function validateMemberData(memberData) {
        const errors = [];

        if (!memberData.name || memberData.name.trim() === '') {
            errors.push('Name is required');
        }

        if (memberData.name && memberData.name.length > 50) {
            errors.push('Name must be less than 50 characters');
        }

        if (memberData.email && !isValidEmail(memberData.email)) {
            errors.push('Invalid email address');
        }

        if (memberData.phone && !isValidPhone(memberData.phone)) {
            errors.push('Invalid phone number');
        }

        return errors;
    }

    // Utility functions
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isValidPhone(phone) {
        // Basic phone validation - can be extended
        const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    // Get default avatar color for a member
    function getDefaultAvatarColor(memberName) {
        const colors = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
        ];

        // Use first character to determine color
        const charCode = memberName.charCodeAt(0) || 0;
        return colors[charCode % colors.length];
    }

    // Public API
    return {
        getAll,
        getById,
        add,
        update,
        remove,
        getPresentMembers,
        getMemberContributions,
        getMemberBalanceHistory,
        validateMemberData,
        getDefaultAvatarColor
    };
})();

// Make available globally
window.membersModule = Members;