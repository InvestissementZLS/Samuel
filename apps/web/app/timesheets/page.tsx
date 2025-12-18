import { getTimesheets } from "@/app/actions/timesheet-actions";
import { TimesheetList } from "@/components/timesheets/timesheet-list";

export default async function TimesheetsPage() {
    const timesheets = await getTimesheets();

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Timesheets</h1>
            </div>
            <TimesheetList initialTimesheets={timesheets} />
        </div>
    );
}
