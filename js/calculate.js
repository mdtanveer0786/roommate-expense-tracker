/**
 * Calculation Module for Roommate Expense Tracker
 * Handles all calculations for splits, balances, and settlements
 */

const Calculate = (function () {
    // Calculate equal split
    function calculateEqualSplit(amount, participants) {
        try {
            if (!Array.isArray(participants) || participants.length === 0) {
                throw new Error('Participants array is required');
            }

            if (!amount || amount <= 0) {
                throw new Error('Valid amount is required');
            }

            const share = amount / participants.length;
            const splitDetails = {};

            participants.forEach(participantId => {
                splitDetails[participantId] = parseFloat(share.toFixed(2));
            });

            return splitDetails;
        } catch (error) {
            console.error('Error calculating equal split:', error);
            throw error;
        }
    }

    // Calculate custom split
    function calculateCustomSplit(amount, splitDetails) {
        try {
            if (!splitDetails || typeof splitDetails !== 'object') {
                throw new Error('Split details object is required');
            }

            if (!amount || amount <= 0) {
                throw new Error('Valid amount is required');
            }

            // Validate that split details sum equals amount
            const total = Object.values(splitDetails).reduce((sum, value) => sum + (value || 0), 0);
            const difference = Math.abs(total - amount);

            if (difference > 0.01) {
                throw new Error(`Custom splits total (${total.toFixed(2)}) doesn't match expense amount (${amount.toFixed(2)})`);
            }

            // Round to 2 decimal places
            const roundedDetails = {};
            Object.keys(splitDetails).forEach(participantId => {
                roundedDetails[participantId] = parseFloat((splitDetails[participantId] || 0).toFixed(2));
            });

            return roundedDetails;
        } catch (error) {
            console.error('Error calculating custom split:', error);
            throw error;
        }
    }

    // Calculate percentage split
    function calculatePercentageSplit(amount, percentageDetails) {
        try {
            if (!percentageDetails || typeof percentageDetails !== 'object') {
                throw new Error('Percentage details object is required');
            }

            if (!amount || amount <= 0) {
                throw new Error('Valid amount is required');
            }

            // Validate that percentages sum to 100
            const totalPercentage = Object.values(percentageDetails).reduce((sum, value) => sum + (value || 0), 0);
            const percentageDifference = Math.abs(totalPercentage - 100);

            if (percentageDifference > 0.1) {
                throw new Error(`Percentages total (${totalPercentage.toFixed(1)}%) should equal 100%`);
            }

            // Calculate amounts from percentages
            const splitDetails = {};
            Object.keys(percentageDetails).forEach(participantId => {
                const percentage = percentageDetails[participantId] || 0;
                const share = (amount * percentage) / 100;
                splitDetails[participantId] = parseFloat(share.toFixed(2));
            });

            return splitDetails;
        } catch (error) {
            console.error('Error calculating percentage split:', error);
            throw error;
        }
    }

    // Calculate member balances from expenses
    function calculateBalances(expenses, members) {
        try {
            const balances = {};

            // Initialize balances
            members.forEach(member => {
                balances[member.id] = 0;
            });

            // Calculate balances from expenses
            expenses.forEach(expense => {
                const paidBy = expense.paidBy;
                const amount = expense.amount || 0;

                // Add to payer's balance
                balances[paidBy] = (balances[paidBy] || 0) + amount;

                // Subtract from participants based on split type
                if (expense.splitDetails) {
                    // Use pre-calculated split details
                    Object.entries(expense.splitDetails).forEach(([participantId, share]) => {
                        if (participantId !== paidBy) {
                            balances[participantId] = (balances[participantId] || 0) - share;
                        }
                    });
                } else if (expense.splitBetween && expense.splitBetween.length > 0) {
                    // Default equal split calculation
                    const share = amount / expense.splitBetween.length;
                    expense.splitBetween.forEach(participantId => {
                        if (participantId !== paidBy) {
                            balances[participantId] = (balances[participantId] || 0) - share;
                        }
                    });
                }
            });

            // Round to 2 decimal places
            Object.keys(balances).forEach(memberId => {
                balances[memberId] = parseFloat(balances[memberId].toFixed(2));
            });

            return balances;
        } catch (error) {
            console.error('Error calculating balances:', error);
            return {};
        }
    }

    // Calculate optimal settlements
    function calculateSettlements(balances, members) {
        try {
            const settlements = [];
            const creditors = [];
            const debtors = [];

            // Separate creditors and debtors
            members.forEach(member => {
                const balance = balances[member.id] || 0;
                if (balance > 0.01) { // Creditor (positive balance)
                    creditors.push({
                        id: member.id,
                        name: member.name,
                        avatar: member.avatar || member.name.charAt(0),
                        color: member.color || '#3B82F6',
                        amount: balance
                    });
                } else if (balance < -0.01) { // Debtor (negative balance)
                    debtors.push({
                        id: member.id,
                        name: member.name,
                        avatar: member.avatar || member.name.charAt(0),
                        color: member.color || '#3B82F6',
                        amount: -balance // Store as positive number
                    });
                }
            });

            // Sort by amount (largest first)
            creditors.sort((a, b) => b.amount - a.amount);
            debtors.sort((a, b) => b.amount - a.amount);

            // Calculate settlements using greedy algorithm
            let i = 0, j = 0;
            while (i < creditors.length && j < debtors.length) {
                const creditor = creditors[i];
                const debtor = debtors[j];

                const settleAmount = Math.min(creditor.amount, debtor.amount);

                if (settleAmount > 0.01) {
                    settlements.push({
                        from: debtor.id,
                        fromName: debtor.name,
                        fromAvatar: debtor.avatar,
                        fromColor: debtor.color,
                        to: creditor.id,
                        toName: creditor.name,
                        toAvatar: creditor.avatar,
                        toColor: creditor.color,
                        amount: parseFloat(settleAmount.toFixed(2))
                    });

                    creditor.amount -= settleAmount;
                    debtor.amount -= settleAmount;
                }

                if (creditor.amount < 0.01) i++;
                if (debtor.amount < 0.01) j++;
            }

            return settlements;
        } catch (error) {
            console.error('Error calculating settlements:', error);
            return [];
        }
    }

    // Calculate monthly averages
    function calculateMonthlyAverages(expensesByMonth, members) {
        try {
            const monthlyAverages = [];

            Object.entries(expensesByMonth).forEach(([monthKey, expenses]) => {
                if (expenses.length > 0) {
                    const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
                    const average = members.length > 0 ? total / members.length : 0;

                    const [year, month] = monthKey.split('-').map(Number);
                    const monthNames = [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                    ];

                    monthlyAverages.push({
                        month: monthKey,
                        monthName: `${monthNames[month - 1]} ${year}`,
                        total: parseFloat(total.toFixed(2)),
                        average: parseFloat(average.toFixed(2)),
                        expenseCount: expenses.length
                    });
                }
            });

            // Sort by month
            monthlyAverages.sort((a, b) => a.month.localeCompare(b.month));

            return monthlyAverages;
        } catch (error) {
            console.error('Error calculating monthly averages:', error);
            return [];
        }
    }

    // Calculate category breakdown
    function calculateCategoryBreakdown(expenses) {
        try {
            const breakdown = {};
            let total = 0;

            expenses.forEach(expense => {
                const category = expense.category || 'Other';
                const amount = expense.amount || 0;

                if (!breakdown[category]) {
                    breakdown[category] = {
                        amount: 0,
                        percentage: 0,
                        count: 0
                    };
                }

                breakdown[category].amount += amount;
                breakdown[category].count++;
                total += amount;
            });

            // Calculate percentages
            Object.keys(breakdown).forEach(category => {
                breakdown[category].percentage = total > 0 ? (breakdown[category].amount / total) * 100 : 0;
                breakdown[category].amount = parseFloat(breakdown[category].amount.toFixed(2));
                breakdown[category].percentage = parseFloat(breakdown[category].percentage.toFixed(1));
            });

            return {
                total: parseFloat(total.toFixed(2)),
                breakdown: breakdown
            };
        } catch (error) {
            console.error('Error calculating category breakdown:', error);
            return { total: 0, breakdown: {} };
        }
    }

    // Calculate member contribution breakdown
    function calculateMemberBreakdown(expenses, members) {
        try {
            const breakdown = {};

            // Initialize breakdown
            members.forEach(member => {
                breakdown[member.id] = {
                    name: member.name,
                    paid: 0,
                    owed: 0,
                    net: 0,
                    percentage: 0
                };
            });

            let totalPaid = 0;

            // Calculate paid and owed amounts
            expenses.forEach(expense => {
                const amount = expense.amount || 0;

                // Amount paid by member
                if (breakdown[expense.paidBy]) {
                    breakdown[expense.paidBy].paid += amount;
                    totalPaid += amount;
                }

                // Amount owed by members (from split)
                if (expense.splitDetails) {
                    Object.entries(expense.splitDetails).forEach(([memberId, share]) => {
                        if (breakdown[memberId] && memberId !== expense.paidBy) {
                            breakdown[memberId].owed += share;
                        }
                    });
                } else if (expense.splitBetween && expense.splitBetween.length > 0) {
                    const share = amount / expense.splitBetween.length;
                    expense.splitBetween.forEach(memberId => {
                        if (breakdown[memberId] && memberId !== expense.paidBy) {
                            breakdown[memberId].owed += share;
                        }
                    });
                }
            });

            // Calculate net and percentages
            Object.keys(breakdown).forEach(memberId => {
                const memberBreakdown = breakdown[memberId];
                memberBreakdown.net = memberBreakdown.paid - memberBreakdown.owed;

                // Calculate percentage of total paid
                memberBreakdown.percentage = totalPaid > 0 ? (memberBreakdown.paid / totalPaid) * 100 : 0;

                // Format numbers
                memberBreakdown.paid = parseFloat(memberBreakdown.paid.toFixed(2));
                memberBreakdown.owed = parseFloat(memberBreakdown.owed.toFixed(2));
                memberBreakdown.net = parseFloat(memberBreakdown.net.toFixed(2));
                memberBreakdown.percentage = parseFloat(memberBreakdown.percentage.toFixed(1));
            });

            return {
                totalPaid: parseFloat(totalPaid.toFixed(2)),
                breakdown: breakdown
            };
        } catch (error) {
            console.error('Error calculating member breakdown:', error);
            return { totalPaid: 0, breakdown: {} };
        }
    }

    // Calculate expense trends
    function calculateTrends(expensesByMonth) {
        try {
            const trends = [];

            Object.entries(expensesByMonth).forEach(([monthKey, expenses]) => {
                const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

                const [year, month] = monthKey.split('-').map(Number);
                const monthNames = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ];

                trends.push({
                    month: monthKey,
                    monthName: `${monthNames[month - 1]} ${year}`,
                    total: parseFloat(total.toFixed(2)),
                    count: expenses.length,
                    average: expenses.length > 0 ? parseFloat((total / expenses.length).toFixed(2)) : 0
                });
            });

            // Sort by month
            trends.sort((a, b) => a.month.localeCompare(b.month));

            // Calculate month-over-month growth
            for (let i = 1; i < trends.length; i++) {
                const previousTotal = trends[i - 1].total;
                const currentTotal = trends[i].total;

                if (previousTotal > 0) {
                    const growth = ((currentTotal - previousTotal) / previousTotal) * 100;
                    trends[i].growth = parseFloat(growth.toFixed(1));
                } else {
                    trends[i].growth = currentTotal > 0 ? 100 : 0;
                }
            }

            return trends;
        } catch (error) {
            console.error('Error calculating trends:', error);
            return [];
        }
    }

    // Calculate settlement impact
    function calculateSettlementImpact(settlements, balances) {
        try {
            const impact = {
                totalSettlements: settlements.length,
                totalAmount: 0,
                averageAmount: 0,
                maxAmount: 0,
                minAmount: 0
            };

            if (settlements.length === 0) {
                return impact;
            }

            let totalAmount = 0;
            let maxAmount = settlements[0]?.amount || 0;
            let minAmount = settlements[0]?.amount || 0;

            settlements.forEach(settlement => {
                totalAmount += settlement.amount || 0;
                maxAmount = Math.max(maxAmount, settlement.amount || 0);
                minAmount = Math.min(minAmount, settlement.amount || 0);
            });

            impact.totalAmount = parseFloat(totalAmount.toFixed(2));
            impact.averageAmount = parseFloat((totalAmount / settlements.length).toFixed(2));
            impact.maxAmount = parseFloat(maxAmount.toFixed(2));
            impact.minAmount = parseFloat(minAmount.toFixed(2));

            return impact;
        } catch (error) {
            console.error('Error calculating settlement impact:', error);
            return {
                totalSettlements: 0,
                totalAmount: 0,
                averageAmount: 0,
                maxAmount: 0,
                minAmount: 0
            };
        }
    }

    // Validate and round amount
    function validateAndRoundAmount(amount, decimalPlaces = 2) {
        try {
            const num = parseFloat(amount);
            if (isNaN(num) || num < 0) {
                throw new Error('Invalid amount');
            }

            const multiplier = Math.pow(10, decimalPlaces);
            return Math.round(num * multiplier) / multiplier;
        } catch (error) {
            console.error('Error validating amount:', error);
            return 0;
        }
    }

    // Public API
    return {
        calculateEqualSplit,
        calculateCustomSplit,
        calculatePercentageSplit,
        calculateBalances,
        calculateSettlements,
        calculateMonthlyAverages,
        calculateCategoryBreakdown,
        calculateMemberBreakdown,
        calculateTrends,
        calculateSettlementImpact,
        validateAndRoundAmount
    };
})();

// Make available globally
window.calculateModule = Calculate;