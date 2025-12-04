'use client';

import { useEffect, useState } from 'react';
import { getLastAudit } from '@/app/actions/inventory-actions';
import Link from 'next/link';
import { differenceInDays } from 'date-fns';

interface WeeklyAuditReminderProps {
    userId: string;
}

export function WeeklyAuditReminder({ userId }: WeeklyAuditReminderProps) {
    const [daysSinceAudit, setDaysSinceAudit] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuditStatus();
    }, [userId]);

    const checkAuditStatus = async () => {
        try {
            const lastAudit = await getLastAudit(userId);
            if (lastAudit) {
                const days = differenceInDays(new Date(), new Date(lastAudit.date));
                setDaysSinceAudit(days);
            } else {
                setDaysSinceAudit(999); // No audit found, treat as overdue
            }
        } catch (error) {
            console.error("Failed to check audit status", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;

    if (daysSinceAudit !== null && daysSinceAudit >= 7) {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            Weekly Inventory Audit is due. You haven't submitted an audit in {daysSinceAudit === 999 ? 'a while' : `${daysSinceAudit} days`}.
                        </p>
                        <p className="mt-2">
                            <Link href="/inventory" className="font-medium text-yellow-700 underline hover:text-yellow-600">
                                Submit Audit Now &rarr;
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
