"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search, Calendar, Filter, X } from "lucide-react";
import { Job, Property, Client, User, Product, UsedProduct } from "@prisma/client";

interface JobFiltersProps {
    jobs: (Job & {
        property: Property & {
            client: Client;
        };
        technicians: User[];
        products: (UsedProduct & { product: Product })[];
    })[];
    onFilterChange: (filteredJobs: any[]) => void;
    technicians?: User[]; // Optional list of technicians for dropdown
    services?: Product[]; // List of products with type=SERVICE
}

export function JobFilters({ jobs, onFilterChange, technicians = [], services = [] }: JobFiltersProps) {
    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [technicianFilter, setTechnicianFilter] = useState("ALL");
    const [serviceFilter, setServiceFilter] = useState("ALL");
    const [periodFilter, setPeriodFilter] = useState("ALL");
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

    // Generate unique years from jobs
    const startYears = useMemo(() => {
        const years = new Set<string>();
        jobs.forEach(j => {
            if (j.scheduledAt) years.add(new Date(j.scheduledAt).getFullYear().toString());
        });
        // Always include current year
        years.add(new Date().getFullYear().toString());
        return Array.from(years).sort().reverse();
    }, [jobs]);

    // Apply filters
    const handleFilter = () => {
        let result = [...jobs];

        // 1. Search Query (Client Name, Address, Job ID)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(j =>
                j.property.client.name.toLowerCase().includes(q) ||
                j.property.address.toLowerCase().includes(q) ||
                j.id.toLowerCase().includes(q) ||
                (j.title || "").toLowerCase().includes(q)
            );
        }

        // 2. Status
        if (statusFilter !== "ALL") {
            result = result.filter(j => j.status === statusFilter);
        }

        // 3. Technician
        if (technicianFilter !== "ALL") {
            result = result.filter(j => j.technicians.some(t => t.id === technicianFilter));
        }

        // 4. Date (Month/Year)
        if (yearFilter !== "ALL") {
            result = result.filter(j => {
                const jobDate = new Date(j.scheduledAt);
                const matchesYear = jobDate.getFullYear().toString() === yearFilter;

                if (monthFilter !== "ALL") {
                    // Month is 0-indexed in JS date, but filter value is likely 0-11 string
                    return matchesYear && jobDate.getMonth().toString() === monthFilter;
                }
                return matchesYear;
            });
        }

        onFilterChange(result);
    };

    // Trigger filter when states change
    // Using simple useEffect or calling handleFilter in render? 
    // Ideally we use useMemo to optimize calculation and useEffect to notify parent.
    // Or we just calculate displayedJobs in a useMemo inside the Parent component?
    // Actually, this component is designed to CONTROL the parent's data or return the filtered list.
    // Let's make this component just UI inputs, and logic is handled via props or hooks.
    // BUT the prompt requested a "complete filter system". 
    // Let's keep it simple: We use a `useEffect` here that calls `onFilterChange`.

    // Instead of duplicating logic, let's use useMemo and useEffect.
    useMemo(() => {
        let result = [...jobs];

        // 1. Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(j =>
                j.property.client.name.toLowerCase().includes(q) ||
                j.property.address.toLowerCase().includes(q) ||
                j.id.toLowerCase().includes(q) ||
                (j.title || "").toLowerCase().includes(q)
            );
        }

        // 2. Status
        if (statusFilter !== "ALL") {
            result = result.filter(j => j.status === statusFilter);
        }

        // 3. Technician
        if (technicianFilter !== "ALL") {
            result = result.filter(j => j.technicians.some(t => t.id === technicianFilter));
        }

        // 4. Service
        if (serviceFilter !== "ALL") {
            result = result.filter(j => j.products?.some(p => p.productId === serviceFilter));
        }

        // 5. Date (Period/Year)
        if (yearFilter !== "ALL") {
            result = result.filter(j => {
                const jobDate = new Date(j.scheduledAt);
                const matchesYear = jobDate.getFullYear().toString() === yearFilter;

                if (periodFilter !== "ALL") {
                    const month = jobDate.getMonth();

                    if (periodFilter === "Q1") return matchesYear && month >= 0 && month <= 2;
                    if (periodFilter === "Q2") return matchesYear && month >= 3 && month <= 5;
                    if (periodFilter === "Q3") return matchesYear && month >= 6 && month <= 8;
                    if (periodFilter === "Q4") return matchesYear && month >= 9 && month <= 11;

                    // Specific Month
                    return matchesYear && month.toString() === periodFilter;
                }
                return matchesYear;
            });
        }

        onFilterChange(result);
    }, [searchQuery, statusFilter, technicianFilter, serviceFilter, periodFilter, yearFilter, jobs]);

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search Client, Address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="md:w-40 border rounded-md py-2 px-3 text-sm focus:ring-indigo-500 bg-white"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>

                {/* Technician Filter */}
                <select
                    value={technicianFilter}
                    onChange={(e) => setTechnicianFilter(e.target.value)}
                    className="md:w-48 border rounded-md py-2 px-3 text-sm focus:ring-indigo-500 bg-white"
                >
                    <option value="ALL">All Technicians</option>
                    {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                {/* Service Filter */}
                <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="md:w-64 border rounded-md py-2 px-3 text-sm focus:ring-indigo-500 bg-white"
                >
                    <option value="ALL">All Services</option>
                    {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date Filter:
                </span>

                {/* Year */}
                <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full md:w-32 border rounded-md py-1.5 px-3 text-sm focus:ring-indigo-500 bg-gray-50"
                >
                    <option value="ALL">All Years</option>
                    {startYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>

                {/* Period (Month/Quarter) */}
                <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    disabled={yearFilter === 'ALL'}
                    className={`w-full md:w-48 border rounded-md py-1.5 px-3 text-sm focus:ring-indigo-500 bg-gray-50 ${yearFilter === 'ALL' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <option value="ALL">All Periods</option>
                    <optgroup label="Quarters">
                        <option value="Q1">Q1 (Jan-Mar)</option>
                        <option value="Q2">Q2 (Apr-Jun)</option>
                        <option value="Q3">Q3 (Jul-Sep)</option>
                        <option value="Q4">Q4 (Oct-Dec)</option>
                    </optgroup>
                    <optgroup label="Months">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i} value={i.toString()}>
                                {format(new Date(2000, i, 1), 'MMMM')}
                            </option>
                        ))}
                    </optgroup>
                </select>

                <div className="ml-auto text-xs text-gray-400">
                    {/* Just a spacer or count display could go here */}
                </div>
            </div>
        </div>
    );
}
