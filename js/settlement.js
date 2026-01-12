/**
 * Settlement Module for Roommate Expense Tracker
 * Handles settlement operations and tracking
 */

const Settlement = (function () {
    // Get all settlements for a month
    function getSettlements(monthKey) {
        try {
            const expenseModule = window.expenseModule;
            const membersModule = window.membersModule;
            const calculateModule = window.calculateModule;

            if (!expenseModule || !membersModule || !calculateModule) {
                return [];
            }

            const expenses = expenseModule.getAll(monthKey);
            const members = membersModule.getAll();

            if (expenses.length === 0 || members.length === 0) {
                return [];
            }

            // Calculate balances
            const balances = calculateModule.calculateBalances(expenses, members);

            // Calculate settlements
            return calculateModule.calculateSettlements(balances, members);
        } catch (error) {
            console.error('Error getting settlements:', error);
            return [];
        }
    }

    // Record a settlement
    function recordSettlement(settlementData) {
        try {
            const expenseModule = window.expenseModule;
            if (!expenseModule) {
                throw new Error('Expense module not available');
            }

            // Validate settlement data
            const errors = validateSettlementData(settlementData);
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            // Create settlement expense
            const settlementExpense = {
                title: `Settlement: ${settlementData.fromName} to ${settlementData.toName}`,
                amount: settlementData.amount,
                paidBy: settlementData.from,
                splitType: 'custom',
                splitBetween: [settlementData.from, settlementData.to],
                splitDetails: {
                    [settlementData.from]: 0,
                    [settlementData.to]: settlementData.amount
                },
                category: 'Settlement',
                date: settlementData.date || new Date().toISOString().split('T')[0],
                notes: settlementData.notes || '',
                isSettlement: true,
                originalSettlementId: settlementData.id
            };

            // Save as expense
            return expenseModule.add(settlementExpense);
        } catch (error) {
            console.error('Error recording settlement:', error);
            throw error;
        }
    }

    // Calculate optimal settlements for a month
    function calculateOptimalSettlements(monthKey) {
        try {
            const settlements = getSettlements(monthKey);

            // Group by from/to pairs to combine multiple small settlements
            const groupedSettlements = groupSettlements(settlements);

            return {
                month: monthKey,
                settlements: groupedSettlements,
                totalAmount: groupedSettlements.reduce((sum, s) => sum + (s.amount || 0), 0),
                settlementCount: groupedSettlements.length,
                efficiency: calculateSettlementEfficiency(groupedSettlements)
            };
        } catch (error) {
            console.error('Error calculating optimal settlements:', error);
            throw error;
        }
    }

    // Process multiple settlements at once
    function processBatchSettlements(settlementsData) {
        try {
            const results = {
                successful: [],
                failed: [],
                totalAmount: 0
            };

            // Process each settlement
            settlementsData.forEach(settlement => {
                try {
                    const result = recordSettlement(settlement);
                    results.successful.push({
                        ...settlement,
                        expenseId: result.id
                    });
                    results.totalAmount += settlement.amount || 0;
                } catch (error) {
                    results.failed.push({
                        ...settlement,
                        error: error.message
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('Error processing batch settlements:', error);
            throw error;
        }
    }

    // Get settlement history
    function getSettlementHistory() {
        try {
            const expenseModule = window.expenseModule;
            if (!expenseModule) {
                return [];
            }

            const allExpenses = expenseModule.getAll();
            const settlementExpenses = [];

            // Find all settlement expenses
            Object.entries(allExpenses).forEach(([monthKey, expenses]) => {
                expenses.forEach(expense => {
                    if (expense.category === 'Settlement' || expense.isSettlement) {
                        settlementExpenses.push({
                            ...expense,
                            monthKey
                        });
                    }
                });
            });

            // Sort by date (newest first)
            settlementExpenses.sort((a, b) =>
                new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
            );

            return settlementExpenses;
        } catch (error) {
            console.error('Error getting settlement history:', error);
            return [];
        }
    }

    // Get settlement statistics
    function getSettlementStatistics(startDate, endDate) {
        try {
            const history = getSettlementHistory();
            const filteredHistory = history.filter(settlement => {
                const settlementDate = new Date(settlement.date || settlement.createdAt);
                return settlementDate >= new Date(startDate) && settlementDate <= new Date(endDate);
            });

            const statistics = {
                totalSettlements: filteredHistory.length,
                totalAmount: 0,
                averageAmount: 0,
                maxAmount: 0,
                minAmount: 0,
                byMember: {}
            };

            if (filteredHistory.length === 0) {
                return statistics;
            }

            // Calculate statistics
            let totalAmount = 0;
            let maxAmount = filteredHistory[0]?.amount || 0;
            let minAmount = filteredHistory[0]?.amount || 0;

            filteredHistory.forEach(settlement => {
                const amount = settlement.amount || 0;
                totalAmount += amount;
                maxAmount = Math.max(maxAmount, amount);
                minAmount = Math.min(minAmount, amount);

                // Track by payer
                const payerId = settlement.paidBy;
                if (!statistics.byMember[payerId]) {
                    statistics.byMember[payerId] = {
                        paid: 0,
                        received: 0,
                        count: 0
                    };
                }

                // Payer paid this amount
                statistics.byMember[payerId].paid += amount;
                statistics.byMember[payerId].count++;

                // Find who received (from split details)
                if (settlement.splitDetails) {
                    Object.entries(settlement.splitDetails).forEach(([memberId, amount]) => {
                        if (memberId !== payerId && amount > 0) {
                            if (!statistics.byMember[memberId]) {
                                statistics.byMember[memberId] = {
                                    paid: 0,
                                    received: 0,
                                    count: 0
                                };
                            }
                            statistics.byMember[memberId].received += amount;
                        }
                    });
                }
            });

            statistics.totalAmount = parseFloat(totalAmount.toFixed(2));
            statistics.averageAmount = parseFloat((totalAmount / filteredHistory.length).toFixed(2));
            statistics.maxAmount = parseFloat(maxAmount.toFixed(2));
            statistics.minAmount = parseFloat(minAmount.toFixed(2));

            return statistics;
        } catch (error) {
            console.error('Error getting settlement statistics:', error);
            return {
                totalSettlements: 0,
                totalAmount: 0,
                averageAmount: 0,
                maxAmount: 0,
                minAmount: 0,
                byMember: {}
            };
        }
    }

    // Validate settlement data
    function validateSettlementData(settlementData) {
        const errors = [];

        if (!settlementData.from) {
            errors.push('From member is required');
        }

        if (!settlementData.to) {
            errors.push('To member is required');
        }

        if (settlementData.from === settlementData.to) {
            errors.push('From and To members cannot be the same');
        }

        if (!settlementData.amount || settlementData.amount <= 0) {
            errors.push('Valid amount is required');
        }

        if (settlementData.amount && settlementData.amount > 1000000) {
            errors.push('Amount is too large');
        }

        return errors;
    }

    // Group settlements to combine multiple transactions
    function groupSettlements(settlements) {
        const groups = {};

        settlements.forEach(settlement => {
            const key = `${settlement.from}-${settlement.to}`;
            const reverseKey = `${settlement.to}-${settlement.from}`;

            // Check if reverse transaction exists
            if (groups[reverseKey]) {
                // Adjust existing settlement
                const existing = groups[reverseKey];
                const difference = existing.amount - settlement.amount;

                if (Math.abs(difference) < 0.01) {
                    // Cancel each other out
                    delete groups[reverseKey];
                } else if (difference > 0) {
                    // Existing is larger
                    existing.amount = difference;
                } else {
                    // New is larger, reverse direction
                    delete groups[reverseKey];
                    groups[key] = {
                        ...settlement,
                        amount: Math.abs(difference)
                    };
                }
            } else if (groups[key]) {
                // Add to existing same-direction settlement
                groups[key].amount += settlement.amount;
            } else {
                // New settlement
                groups[key] = { ...settlement };
            }
        });

        // Convert back to array and filter out zero amounts
        return Object.values(groups)
            .filter(s => s.amount > 0.01)
            .map(s => ({
                ...s,
                amount: parseFloat(s.amount.toFixed(2))
            }));
    }

    // Calculate settlement efficiency
    function calculateSettlementEfficiency(settlements) {
        if (settlements.length === 0) {
            return 100; // No settlements needed = 100% efficient
        }

        // Simple efficiency calculation based on number of transactions
        // Fewer transactions = more efficient
        const maxPossibleTransactions = settlements.length * 2; // Worst case: everyone pays everyone
        const actualTransactions = settlements.length;

        const efficiency = ((maxPossibleTransactions - actualTransactions) / maxPossibleTransactions) * 100;
        return Math.max(0, Math.min(100, parseFloat(efficiency.toFixed(1))));
    }

    // Generate settlement report
    function generateSettlementReport(monthKey) {
        try {
            const optimalSettlements = calculateOptimalSettlements(monthKey);
            const expenseModule = window.expenseModule;
            const membersModule = window.membersModule;

            if (!expenseModule || !membersModule) {
                throw new Error('Required modules not available');
            }

            const expenses = expenseModule.getAll(monthKey);
            const members = membersModule.getAll();
            const calculateModule = window.calculateModule;

            if (!calculateModule) {
                throw new Error('Calculate module not available');
            }

            // Calculate current balances
            const balances = calculateModule.calculateBalances(expenses, members);

            // Get member details
            const memberDetails = {};
            members.forEach(member => {
                memberDetails[member.id] = {
                    name: member.name,
                    avatar: member.avatar || member.name.charAt(0),
                    color: member.color || '#3B82F6'
                };
            });

            // Format balances
            const formattedBalances = Object.entries(balances).map(([memberId, balance]) => ({
                memberId,
                memberName: memberDetails[memberId]?.name || 'Unknown',
                avatar: memberDetails[memberId]?.avatar,
                color: memberDetails[memberId]?.color,
                balance: parseFloat(balance.toFixed(2)),
                status: balance > 0.01 ? 'creditor' : balance < -0.01 ? 'debtor' : 'settled'
            })).filter(b => Math.abs(b.balance) > 0.01);

            return {
                month: monthKey,
                monthName: getMonthName(monthKey),
                totalUnsettled: formattedBalances.reduce((sum, b) => sum + Math.abs(b.balance), 0) / 2,
                balances: formattedBalances,
                optimalSettlements: optimalSettlements,
                efficiency: optimalSettlements.efficiency,
                reportGenerated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating settlement report:', error);
            throw error;
        }
    }

    // Export settlements to various formats
    function exportSettlements(monthKey, format = 'json') {
        try {
            const report = generateSettlementReport(monthKey);

            switch (format) {
                case 'json':
                    return JSON.stringify(report, null, 2);

                case 'csv':
                    return convertToCSV(report);

                case 'text':
                    return formatAsText(report);

                default:
                    return report;
            }
        } catch (error) {
            console.error('Error exporting settlements:', error);
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

    // Convert report to CSV
    function convertToCSV(report) {
        let csv = 'Roommate Expense Settlements Report\n';
        csv += `Month: ${report.monthName}\n`;
        csv += `Report Generated: ${new Date(report.reportGenerated).toLocaleString()}\n\n`;

        csv += 'Current Balances\n';
        csv += 'Member,Balance,Status\n';
        report.balances.forEach(balance => {
            const status = balance.status === 'creditor' ? 'Will Receive' : 'Owes';
            csv += `${balance.memberName},${balance.balance},${status}\n`;
        });

        csv += '\n\nRecommended Settlements\n';
        csv += 'From,To,Amount\n';
        report.optimalSettlements.settlements.forEach(settlement => {
            csv += `${settlement.fromName},${settlement.toName},${settlement.amount}\n`;
        });

        csv += `\nTotal Unsettled Amount: ${report.totalUnsettled.toFixed(2)}\n`;
        csv += `Settlement Efficiency: ${report.efficiency}%\n`;

        return csv;
    }

    // Format report as readable text
    function formatAsText(report) {
        let text = '='.repeat(50) + '\n';
        text += `SETTLEMENT REPORT - ${report.monthName}\n`;
        text += '='.repeat(50) + '\n\n';

        text += 'CURRENT BALANCES:\n';
        text += '-'.repeat(30) + '\n';
        report.balances.forEach(balance => {
            const symbol = balance.status === 'creditor' ? '+' : '-';
            const status = balance.status === 'creditor' ? '(Will Receive)' : '(Owes)';
            text += `${balance.memberName}: ${symbol}${Math.abs(balance.balance).toFixed(2)} ${status}\n`;
        });

        text += '\nRECOMMENDED SETTLEMENTS:\n';
        text += '-'.repeat(30) + '\n';
        report.optimalSettlements.settlements.forEach((settlement, index) => {
            text += `${index + 1}. ${settlement.fromName} → ${settlement.toName}: ${settlement.amount.toFixed(2)}\n`;
        });

        text += '\n' + '='.repeat(50) + '\n';
        text += `SUMMARY:\n`;
        text += `Total Unsettled: ${report.totalUnsettled.toFixed(2)}\n`;
        text += `Settlement Efficiency: ${report.efficiency}%\n`;
        text += `Transactions Required: ${report.optimalSettlements.settlementCount}\n`;
        text += '='.repeat(50) + '\n';

        return text;
    }

    // Public API
    return {
        getSettlements,
        recordSettlement,
        calculateOptimalSettlements,
        processBatchSettlements,
        getSettlementHistory,
        getSettlementStatistics,
        generateSettlementReport,
        exportSettlements,
        validateSettlementData
    };
})();

// Make available globally
window.settlementModule = Settlement;