/**
 * Expense Module for Roommate Expense Tracker
 * Handles expense-related operations
 */

const Expense = (function () {
    // Get all expenses
    function getAll(monthKey = null) {
        try {
            const storage = window.storage;
            return storage ? storage.getExpenses(monthKey) : (monthKey ? [] : {});
        } catch (error) {
            console.error('Error getting expenses:', error);
            return monthKey ? [] : {};
        }
    }

    // Add a new expense
    function add(expenseData) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            // Validate expense data
            const errors = validateExpenseData(expenseData);
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            // Auto-exclude absent members
            const processedData = processAbsentMembers(expenseData);

            return storage.saveExpense(processedData);
        } catch (error) {
            console.error('Error adding expense:', error);
            throw error;
        }
    }

    // Update an existing expense
    function update(expenseId, updates) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            // If updates include date or split between, process absent members
            if (updates.date || updates.splitBetween) {
                const currentExpense = getById(expenseId);
                if (!currentExpense) {
                    throw new Error('Expense not found');
                }

                const mergedData = { ...currentExpense, ...updates };
                const processedData = processAbsentMembers(mergedData);

                // Remove original fields to avoid duplicates
                delete processedData.id;
                delete processedData.createdAt;

                return storage.updateExpense(expenseId, processedData);
            }

            return storage.updateExpense(expenseId, updates);
        } catch (error) {
            console.error('Error updating expense:', error);
            throw error;
        }
    }

    // Delete an expense
    function remove(expenseId) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            return storage.deleteExpense(expenseId);
        } catch (error) {
            console.error('Error deleting expense:', error);
            throw error;
        }
    }

    // Get expense by ID
    function getById(expenseId) {
        try {
            const storage = window.storage;
            if (!storage) {
                return null;
            }

            const expenses = storage.getExpenses();

            for (const monthKey in expenses) {
                const expense = expenses[monthKey].find(e => e.id === expenseId);
                if (expense) {
                    return {
                        ...expense,
                        monthKey
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting expense by ID:', error);
            return null;
        }
    }

    // Get expenses by member
    function getByMember(memberId, monthKey = null) {
        try {
            const expenses = monthKey ? getAll(monthKey) : Object.values(getAll()).flat();

            return expenses.filter(expense =>
                expense.paidBy === memberId ||
                (expense.splitBetween && expense.splitBetween.includes(memberId))
            );
        } catch (error) {
            console.error('Error getting expenses by member:', error);
            return [];
        }
    }

    // Get expenses by category
    function getByCategory(category, monthKey = null) {
        try {
            const expenses = monthKey ? getAll(monthKey) : Object.values(getAll()).flat();
            return expenses.filter(expense => expense.category === category);
        } catch (error) {
            console.error('Error getting expenses by category:', error);
            return [];
        }
    }

    // Get expense statistics for a month
    function getMonthStatistics(monthKey) {
        try {
            const expenses = getAll(monthKey);
            const storage = window.storage;
            const members = storage ? storage.getMembers() : [];

            if (expenses.length === 0) {
                return {
                    total: 0,
                    average: 0,
                    count: 0,
                    byCategory: {},
                    byMember: {}
                };
            }

            const statistics = {
                total: 0,
                average: 0,
                count: expenses.length,
                byCategory: {},
                byMember: {}
            };

            // Initialize member statistics
            members.forEach(member => {
                statistics.byMember[member.id] = {
                    name: member.name,
                    paid: 0,
                    owed: 0,
                    net: 0
                };
            });

            // Calculate statistics
            expenses.forEach(expense => {
                // Total
                statistics.total += expense.amount || 0;

                // By category
                const category = expense.category || 'Other';
                statistics.byCategory[category] = (statistics.byCategory[category] || 0) + (expense.amount || 0);

                // By member
                if (statistics.byMember[expense.paidBy]) {
                    statistics.byMember[expense.paidBy].paid += expense.amount || 0;
                }

                // Split details
                if (expense.splitDetails) {
                    Object.entries(expense.splitDetails).forEach(([memberId, amount]) => {
                        if (statistics.byMember[memberId] && memberId !== expense.paidBy) {
                            statistics.byMember[memberId].owed += amount || 0;
                        }
                    });
                } else if (expense.splitBetween) {
                    // Equal split calculation
                    const participantCount = expense.splitBetween.length;
                    const share = participantCount > 0 ? expense.amount / participantCount : 0;

                    expense.splitBetween.forEach(memberId => {
                        if (statistics.byMember[memberId] && memberId !== expense.paidBy) {
                            statistics.byMember[memberId].owed += share;
                        }
                    });
                }
            });

            // Calculate net balances and format numbers
            Object.keys(statistics.byMember).forEach(memberId => {
                const memberStats = statistics.byMember[memberId];
                memberStats.net = memberStats.paid - memberStats.owed;

                // Format to 2 decimal places
                memberStats.paid = parseFloat(memberStats.paid.toFixed(2));
                memberStats.owed = parseFloat(memberStats.owed.toFixed(2));
                memberStats.net = parseFloat(memberStats.net.toFixed(2));
            });

            // Calculate average
            statistics.average = members.length > 0 ? statistics.total / members.length : 0;
            statistics.total = parseFloat(statistics.total.toFixed(2));
            statistics.average = parseFloat(statistics.average.toFixed(2));

            return statistics;
        } catch (error) {
            console.error('Error getting month statistics:', error);
            return {
                total: 0,
                average: 0,
                count: 0,
                byCategory: {},
                byMember: {}
            };
        }
    }

    // Get expense trends over time
    function getTrends(startMonthKey, endMonthKey) {
        try {
            const storage = window.storage;
            if (!storage) {
                return [];
            }

            const allExpenses = getAll();
            const trends = [];

            // Generate list of months between start and end
            const [startYear, startMonth] = startMonthKey.split('-').map(Number);
            const [endYear, endMonth] = endMonthKey.split('-').map(Number);

            let currentYear = startYear;
            let currentMonth = startMonth;

            while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
                const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
                const monthExpenses = allExpenses[monthKey] || [];
                const stats = getMonthStatistics(monthKey);

                trends.push({
                    month: monthKey,
                    monthName: getMonthName(monthKey),
                    total: stats.total,
                    count: stats.count,
                    average: stats.average
                });

                // Move to next month
                currentMonth++;
                if (currentMonth > 12) {
                    currentMonth = 1;
                    currentYear++;
                }
            }

            return trends;
        } catch (error) {
            console.error('Error getting trends:', error);
            return [];
        }
    }

    // Validate expense data
    function validateExpenseData(expenseData) {
        const errors = [];

        if (!expenseData.title || expenseData.title.trim() === '') {
            errors.push('Title is required');
        }

        if (expenseData.title && expenseData.title.length > 100) {
            errors.push('Title must be less than 100 characters');
        }

        if (!expenseData.amount || isNaN(expenseData.amount) || expenseData.amount <= 0) {
            errors.push('Valid amount is required');
        }

        if (!expenseData.paidBy) {
            errors.push('Payer is required');
        }

        if (!expenseData.splitBetween || !Array.isArray(expenseData.splitBetween) || expenseData.splitBetween.length === 0) {
            errors.push('At least one participant is required');
        }

        if (!expenseData.date) {
            errors.push('Date is required');
        }

        // Validate split details
        if (expenseData.splitType === 'custom' && expenseData.splitDetails) {
            const total = Object.values(expenseData.splitDetails).reduce((sum, amount) => sum + (amount || 0), 0);
            const difference = Math.abs(total - expenseData.amount);
            if (difference > 0.01) {
                errors.push(`Custom splits total (${total}) doesn't match expense amount (${expenseData.amount})`);
            }
        } else if (expenseData.splitType === 'percentage' && expenseData.splitDetails) {
            const total = Object.values(expenseData.splitDetails).reduce((sum, percentage) => sum + (percentage || 0), 0);
            if (Math.abs(total - 100) > 0.1) {
                errors.push(`Percentages total (${total}%) should equal 100%`);
            }
        }

        return errors;
    }

    // Process absent members - auto-exclude them from splits
    function processAbsentMembers(expenseData) {
        try {
            const presenceModule = window.presenceModule;
            if (!presenceModule) {
                return expenseData;
            }

            const expenseDate = expenseData.date;
            if (!expenseDate) {
                return expenseData;
            }

            // Get absent members on expense date
            const absentMembers = presenceModule.getAbsentMembers(expenseDate);
            const absentMemberIds = absentMembers.map(member => member.id);

            // Filter out absent members from split between
            if (expenseData.splitBetween && Array.isArray(expenseData.splitBetween)) {
                const originalParticipants = expenseData.splitBetween;
                const presentParticipants = originalParticipants.filter(
                    memberId => !absentMemberIds.includes(memberId)
                );

                // If all participants are absent, keep at least the payer
                if (presentParticipants.length === 0 && expenseData.paidBy) {
                    presentParticipants.push(expenseData.paidBy);
                }

                expenseData.splitBetween = presentParticipants;

                // Recalculate split details if needed
                if (expenseData.splitType === 'equal') {
                    // Recalculate equal splits
                    const participantCount = presentParticipants.length;
                    const share = participantCount > 0 ? expenseData.amount / participantCount : 0;

                    expenseData.splitDetails = {};
                    presentParticipants.forEach(memberId => {
                        expenseData.splitDetails[memberId] = share;
                    });
                } else if (expenseData.splitDetails) {
                    // Remove absent members from split details
                    Object.keys(expenseData.splitDetails).forEach(memberId => {
                        if (absentMemberIds.includes(memberId)) {
                            delete expenseData.splitDetails[memberId];
                        }
                    });

                    // Redistribute amounts if needed
                    if (expenseData.splitType === 'custom') {
                        const remainingAmount = Object.values(expenseData.splitDetails).reduce((sum, amount) => sum + amount, 0);
                        const difference = expenseData.amount - remainingAmount;

                        if (Math.abs(difference) > 0.01 && presentParticipants.length > 0) {
                            // Distribute difference equally among present participants
                            const adjustment = difference / presentParticipants.length;
                            presentParticipants.forEach(memberId => {
                                expenseData.splitDetails[memberId] = (expenseData.splitDetails[memberId] || 0) + adjustment;
                            });
                        }
                    } else if (expenseData.splitType === 'percentage') {
                        const remainingPercentage = Object.values(expenseData.splitDetails).reduce((sum, percentage) => sum + percentage, 0);
                        const difference = 100 - remainingPercentage;

                        if (Math.abs(difference) > 0.1 && presentParticipants.length > 0) {
                            // Distribute difference equally among present participants
                            const adjustment = difference / presentParticipants.length;
                            presentParticipants.forEach(memberId => {
                                expenseData.splitDetails[memberId] = (expenseData.splitDetails[memberId] || 0) + adjustment;
                            });
                        }
                    }
                }
            }

            return expenseData;
        } catch (error) {
            console.error('Error processing absent members:', error);
            return expenseData;
        }
    }

    // Generate expense report
    function generateReport(monthKey) {
        try {
            const expenses = getAll(monthKey);
            const storage = window.storage;

            if (!storage) {
                return {
                    month: monthKey,
                    total: 0,
                    count: 0,
                    expenses: [],
                    summary: {}
                };
            }

            const members = storage.getMembers();
            const memberMap = {};
            members.forEach(member => {
                memberMap[member.id] = member;
            });

            // Process expenses
            const processedExpenses = expenses.map(expense => {
                const payer = memberMap[expense.paidBy];
                const participants = expense.splitBetween.map(memberId =>
                    memberMap[memberId] ? memberMap[memberId].name : 'Unknown'
                );

                return {
                    ...expense,
                    payerName: payer ? payer.name : 'Unknown',
                    participantNames: participants,
                    formattedDate: new Date(expense.date).toLocaleDateString()
                };
            });

            // Generate summary
            const statistics = getMonthStatistics(monthKey);

            return {
                month: monthKey,
                monthName: getMonthName(monthKey),
                total: statistics.total,
                average: statistics.average,
                count: statistics.count,
                expenses: processedExpenses,
                summary: statistics
            };
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }

    // Utility function to get month name
    function getMonthName(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${monthNames[month - 1]} ${year}`;
    }

    // Public API
    return {
        getAll,
        getById,
        getByMember,
        getByCategory,
        add,
        update,
        remove,
        getMonthStatistics,
        getTrends,
        generateReport,
        validateExpenseData,
        processAbsentMembers
    };
})();

// Make available globally
window.expenseModule = Expense;