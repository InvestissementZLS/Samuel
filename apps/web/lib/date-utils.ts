// Pure utility functions for date parsing — NOT a server action file

export function parseScheduledDate(dateHint: string, timeHint: string, period: 'AM' | 'PM' | 'ANY'): Date {
    const now = new Date();
    let targetDate = new Date();

    const lowerHint = (dateHint || '').toLowerCase().trim();

    if (lowerHint === 'demain' || lowerHint === 'tomorrow') {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 1);
    } else if (lowerHint.includes('lundi') || lowerHint.includes('monday')) {
        targetDate = getNextWeekday(now, 1);
    } else if (lowerHint.includes('mardi') || lowerHint.includes('tuesday')) {
        targetDate = getNextWeekday(now, 2);
    } else if (lowerHint.includes('mercredi') || lowerHint.includes('wednesday')) {
        targetDate = getNextWeekday(now, 3);
    } else if (lowerHint.includes('jeudi') || lowerHint.includes('thursday')) {
        targetDate = getNextWeekday(now, 4);
    } else if (lowerHint.includes('vendredi') || lowerHint.includes('friday')) {
        targetDate = getNextWeekday(now, 5);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(lowerHint)) {
        targetDate = new Date(lowerHint);
    } else if (/\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i.test(lowerHint)) {
        const monthMap: Record<string, number> = {
            'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
            'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
        };
        const match = lowerHint.match(/(\d{1,2})\s+(\w+)/);
        if (match) {
            const day = parseInt(match[1]);
            const month = monthMap[match[2]];
            if (month !== undefined) {
                targetDate = new Date(now.getFullYear(), month, day);
                if (targetDate < now) targetDate.setFullYear(now.getFullYear() + 1);
            }
        }
    } else {
        // Default: tomorrow
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 1);
    }

    // Set time
    const lowerTime = (timeHint || '').toLowerCase().trim();

    if (/(\d{1,2})h(\d{2})?/.test(lowerTime)) {
        const match = lowerTime.match(/(\d{1,2})h(\d{2})?/);
        if (match) {
            targetDate.setHours(parseInt(match[1]), parseInt(match[2] || '0'), 0, 0);
        }
    } else if (period === 'AM' || lowerTime.includes('matin')) {
        targetDate.setHours(9, 0, 0, 0);
    } else if (period === 'PM' || lowerTime.includes('après-midi') || lowerTime.includes('pm')) {
        targetDate.setHours(13, 0, 0, 0);
    } else {
        targetDate.setHours(9, 0, 0, 0);
    }

    return targetDate;
}

function getNextWeekday(from: Date, targetDayOfWeek: number): Date {
    const result = new Date(from);
    const currentDay = result.getDay();
    let daysUntil = targetDayOfWeek - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    result.setDate(result.getDate() + daysUntil);
    return result;
}
