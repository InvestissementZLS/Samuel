import { getExpenses } from "@/app/actions/expense-actions";
import { ExpenseClient } from "./expense-client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";

export default async function ExpensesPage() {
    // Fetch data server-side
    const { expenses, total } = await getExpenses();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dépenses</h1>
                    <p className="text-gray-500 mt-2">Gestion des coûts fixes et variables de l'entreprise.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total ce mois
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            ${total.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(), 'MMMM yyyy', { locale: fr })}
                        </p>
                    </CardContent>
                </Card>

                {/* Placeholder Card */}
                <Card className="opacity-60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Catégorie Principale
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">---</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Calcul en cours...
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Client Component for Interactivity (Add/Delete/List) */}
            <ExpenseClient initialExpenses={expenses} />
        </div>
    );
}
