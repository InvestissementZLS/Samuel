export const translations = {
    EN: {
        portalTitle: "Client Portal",
        outstandingInvoices: "Outstanding Invoices",
        noOutstandingInvoices: "No outstanding invoices. Thank you!",
        upcomingAppointments: "Upcoming Appointments",
        noUpcomingAppointments: "No upcoming appointments scheduled.",
        paymentHistory: "Payment History",
        noPaymentHistory: "No payment history found.",
        tech: "Tech",
        paid: "PAID",
        invoice: "Invoice",
        status: {
            PENDING: "Pending",
            SCHEDULED: "Scheduled",
            IN_PROGRESS: "In Progress",
            COMPLETED: "Completed",
            CANCELLED: "Cancelled",
        },
        payNow: "Pay Now",
        redirecting: "Redirecting to secure checkout...",
        paymentFailed: "Failed to initiate payment",
        error: "An error occurred"
    },
    FR: {
        portalTitle: "Portail Client",
        outstandingInvoices: "Factures Impayées",
        noOutstandingInvoices: "Aucune facture impayée. Merci !",
        upcomingAppointments: "Rendez-vous à venir",
        noUpcomingAppointments: "Aucun rendez-vous prévu.",
        paymentHistory: "Historique des paiements",
        noPaymentHistory: "Aucun historique de paiement trouvé.",
        tech: "Tech",
        paid: "PAYÉ",
        invoice: "Facture",
        status: {
            PENDING: "En attente",
            SCHEDULED: "Planifié",
            IN_PROGRESS: "En cours",
            COMPLETED: "Terminé",
            CANCELLED: "Annulé",
        },
        payNow: "Payer maintenant",
        redirecting: "Redirection vers le paiement sécurisé...",
        paymentFailed: "Échec de l'initialisation du paiement",
        error: "Une erreur est survenue"
    }
};

export type Language = "EN" | "FR";
