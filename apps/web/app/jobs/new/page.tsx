import { createJob } from '@/app/actions/jobs';
import { prisma } from '@/lib/prisma';

export default async function NewJobPage() {
    // Fetch properties and technicians to populate dropdowns
    const properties = await prisma.property.findMany({
        include: { client: true },
    });

    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
    });

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Create New Work Order</h1>

            <form action={createJob} className="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200">
                <div>
                    <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700">
                        Client / Property
                    </label>
                    <select
                        name="propertyId"
                        id="propertyId"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                        <option value="">Select a property...</option>
                        {properties.map((prop) => (
                            <option key={prop.id} value={prop.id}>
                                {prop.client.name} - {prop.address}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Job Description / Service Type
                    </label>
                    <input
                        type="text"
                        name="description"
                        id="description"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="e.g., Quarterly Pest Control"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
                            Date
                        </label>
                        <input
                            type="date"
                            name="scheduledDate"
                            id="scheduledDate"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                    </div>
                    <div>
                        <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">
                            Time
                        </label>
                        <input
                            type="time"
                            name="scheduledTime"
                            id="scheduledTime"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="techId" className="block text-sm font-medium text-gray-700">
                        Assign Technicians (Hold Ctrl/Cmd to select multiple)
                    </label>
                    <select
                        name="techId"
                        id="techId"
                        multiple
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border h-32"
                    >
                        {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                                {tech.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Create Work Order
                    </button>
                </div>
            </form>
        </div>
    );
}
