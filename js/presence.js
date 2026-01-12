/**
 * Presence Module for Roommate Expense Tracker
 * Handles absence and presence tracking
 */

const Presence = (function () {
    // Get all presence records
    function getAll() {
        try {
            const storage = window.storage;
            return storage ? storage.getPresenceRecords() : [];
        } catch (error) {
            console.error('Error getting presence records:', error);
            return [];
        }
    }

    // Add a new absence record
    function addAbsence(absenceData) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            // Validate absence data
            const errors = validateAbsenceData(absenceData);
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            return storage.savePresenceRecord(absenceData);
        } catch (error) {
            console.error('Error adding absence:', error);
            throw error;
        }
    }

    // Update an absence record
    function updateAbsence(recordId, updates) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            const record = getById(recordId);
            if (!record) {
                throw new Error('Absence record not found');
            }

            const updatedData = { ...record, ...updates, id: recordId };
            return storage.savePresenceRecord(updatedData);
        } catch (error) {
            console.error('Error updating absence:', error);
            throw error;
        }
    }

    // Delete an absence record
    function deleteAbsence(recordId) {
        try {
            const storage = window.storage;
            if (!storage) {
                throw new Error('Storage not available');
            }

            return storage.deletePresenceRecord(recordId);
        } catch (error) {
            console.error('Error deleting absence:', error);
            throw error;
        }
    }

    // Get absence record by ID
    function getById(recordId) {
        try {
            const records = getAll();
            return records.find(record => record.id === recordId) || null;
        } catch (error) {
            console.error('Error getting absence by ID:', error);
            return null;
        }
    }

    // Get absences for a specific member
    function getByMember(memberId) {
        try {
            const records = getAll();
            return records.filter(record => record.memberId === memberId);
        } catch (error) {
            console.error('Error getting absences by member:', error);
            return [];
        }
    }

    // Get absences for a specific date range
    function getByDateRange(startDate, endDate) {
        try {
            const records = getAll();
            const start = new Date(startDate);
            const end = new Date(endDate || startDate);

            return records.filter(record => {
                const recordStart = new Date(record.startDate);
                const recordEnd = new Date(record.endDate || record.startDate);

                return !(recordEnd < start || recordStart > end);
            });
        } catch (error) {
            console.error('Error getting absences by date range:', error);
            return [];
        }
    }

    // Check if a member is absent on a specific date
    function isAbsent(memberId, date) {
        try {
            const records = getAll();
            const targetDate = new Date(date);

            return records.some(record => {
                if (record.memberId !== memberId) return false;

                const startDate = new Date(record.startDate);
                const endDate = record.endDate ? new Date(record.endDate) : startDate;

                return targetDate >= startDate && targetDate <= endDate;
            });
        } catch (error) {
            console.error('Error checking absence:', error);
            return false;
        }
    }

    // Get absent members for a specific date
    function getAbsentMembers(date) {
        try {
            const storage = window.storage;
            if (!storage) {
                return [];
            }

            const members = storage.getMembers();
            const targetDate = new Date(date);
            const absenceRecords = getAll();

            return members.filter(member => {
                return absenceRecords.some(record => {
                    if (record.memberId !== member.id) return false;

                    const startDate = new Date(record.startDate);
                    const endDate = record.endDate ? new Date(record.endDate) : startDate;

                    return targetDate >= startDate && targetDate <= endDate;
                });
            });
        } catch (error) {
            console.error('Error getting absent members:', error);
            return [];
        }
    }

    // Get present members for a specific date
    function getPresentMembers(date) {
        try {
            const storage = window.storage;
            if (!storage) {
                return [];
            }

            const members = storage.getMembers();
            const absentMembers = getAbsentMembers(date);

            return members.filter(member =>
                !absentMembers.some(absent => absent.id === member.id)
            );
        } catch (error) {
            console.error('Error getting present members:', error);
            const storage = window.storage;
            return storage ? storage.getMembers() : [];
        }
    }

    // Calculate total absent days for a member in a month
    function getAbsentDaysCount(memberId, monthKey) {
        try {
            const [year, month] = monthKey.split('-').map(Number);
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const memberAbsences = getByMember(memberId);
            let totalDays = 0;

            memberAbsences.forEach(record => {
                const recordStart = new Date(record.startDate);
                const recordEnd = new Date(record.endDate || record.startDate);

                // Adjust to month boundaries
                const overlapStart = recordStart < startOfMonth ? startOfMonth : recordStart;
                const overlapEnd = recordEnd > endOfMonth ? endOfMonth : recordEnd;

                if (overlapStart <= overlapEnd) {
                    const diffTime = overlapEnd - overlapStart;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    totalDays += diffDays;
                }
            });

            return totalDays;
        } catch (error) {
            console.error('Error calculating absent days:', error);
            return 0;
        }
    }

    // Validate absence data
    function validateAbsenceData(absenceData) {
        const errors = [];

        if (!absenceData.memberId) {
            errors.push('Member ID is required');
        }

        if (!absenceData.startDate) {
            errors.push('Start date is required');
        }

        if (!absenceData.reason || absenceData.reason.trim() === '') {
            errors.push('Reason is required');
        }

        if (absenceData.endDate && new Date(absenceData.endDate) < new Date(absenceData.startDate)) {
            errors.push('End date must be after start date');
        }

        return errors;
    }

    // Get absence statistics for a month
    function getMonthStatistics(monthKey) {
        try {
            const [year, month] = monthKey.split('-').map(Number);
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);
            const totalDaysInMonth = endOfMonth.getDate();

            const storage = window.storage;
            if (!storage) {
                return {
                    totalDays: totalDaysInMonth,
                    absentDays: 0,
                    presentDays: totalDaysInMonth
                };
            }

            const members = storage.getMembers();
            const absenceRecords = getAll();

            // Calculate absent days per member
            const statistics = members.map(member => {
                const memberAbsences = absenceRecords.filter(record =>
                    record.memberId === member.id
                );

                let absentDays = 0;
                memberAbsences.forEach(record => {
                    const recordStart = new Date(record.startDate);
                    const recordEnd = new Date(record.endDate || record.startDate);

                    // Adjust to month boundaries
                    const overlapStart = recordStart < startOfMonth ? startOfMonth : recordStart;
                    const overlapEnd = recordEnd > endOfMonth ? endOfMonth : recordEnd;

                    if (overlapStart <= overlapEnd) {
                        const diffTime = overlapEnd - overlapStart;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        absentDays += diffDays;
                    }
                });

                const presentDays = totalDaysInMonth - absentDays;

                return {
                    memberId: member.id,
                    memberName: member.name,
                    totalDays: totalDaysInMonth,
                    absentDays,
                    presentDays,
                    absencePercentage: (absentDays / totalDaysInMonth) * 100
                };
            });

            return statistics;
        } catch (error) {
            console.error('Error getting month statistics:', error);
            return [];
        }
    }

    // Generate absence report
    function generateReport(startDate, endDate) {
        try {
            const absenceRecords = getByDateRange(startDate, endDate);
            const storage = window.storage;

            if (!storage) {
                return {
                    period: `${startDate} to ${endDate}`,
                    totalAbsences: 0,
                    records: [],
                    summary: {}
                };
            }

            const members = storage.getMembers();
            const memberMap = {};
            members.forEach(member => {
                memberMap[member.id] = member;
            });

            // Process records
            const processedRecords = absenceRecords.map(record => {
                const member = memberMap[record.memberId];
                const start = new Date(record.startDate);
                const end = new Date(record.endDate || record.startDate);
                const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

                return {
                    ...record,
                    memberName: member ? member.name : 'Unknown',
                    duration,
                    formattedPeriod: start.toLocaleDateString() + (record.endDate ? ` - ${end.toLocaleDateString()}` : '')
                };
            });

            // Generate summary
            const summary = {
                totalAbsences: processedRecords.length,
                totalDays: processedRecords.reduce((sum, record) => sum + record.duration, 0),
                byMember: {},
                byReason: {}
            };

            processedRecords.forEach(record => {
                // By member
                if (!summary.byMember[record.memberId]) {
                    summary.byMember[record.memberId] = {
                        name: record.memberName,
                        count: 0,
                        days: 0
                    };
                }
                summary.byMember[record.memberId].count++;
                summary.byMember[record.memberId].days += record.duration;

                // By reason
                if (!summary.byReason[record.reason]) {
                    summary.byReason[record.reason] = {
                        count: 0,
                        days: 0
                    };
                }
                summary.byReason[record.reason].count++;
                summary.byReason[record.reason].days += record.duration;
            });

            return {
                period: `${startDate} to ${endDate}`,
                totalAbsences: processedRecords.length,
                records: processedRecords,
                summary
            };
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }

    // Public API
    return {
        getAll,
        getById,
        getByMember,
        getByDateRange,
        addAbsence,
        updateAbsence,
        deleteAbsence,
        isAbsent,
        getAbsentMembers,
        getPresentMembers,
        getAbsentDaysCount,
        getMonthStatistics,
        generateReport,
        validateAbsenceData
    };
})();

// Make available globally
window.presenceModule = Presence;