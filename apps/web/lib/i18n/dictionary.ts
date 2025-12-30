export type Locale = 'en' | 'fr';

export const dictionary = {
    en: {
        common: {
            search: "Search",
            viewProfile: "View Profile",
            adminUser: "Admin User",
            logout: "Logout",
        },
        sidebar: {
            dashboard: "Dashboard",
            calendar: "Calendar",
            jobs: "Jobs",
            quotes: "Quotes",
            invoices: "Invoices",
            clients: "Clients",
            technicians: "Technicians",
            products: "Products",
            commissions: "Commissions",
            reports: "Reports",
            timesheets: "Timesheets",
            settings: "Settings",
        },
        divisions: {
            extermination: "Extermination",
            entreprises: "Enterprises",
        },
        jobDetails: {
            title: "Job Details",
            backToCalendar: "Back to Calendar",
            locationClient: "Location & Client",
            client: "Client",
            property: "Property",
            accessInfo: "Access Info",
            schedule: "Schedule",
            dateTime: "Date & Time",
            technician: "Technician",
            description: "Description",
            notes: "Notes",
            photos: "Photos",
            products: "Products",
            financials: "Financials",
            noDescription: "No description",
        }
    },
    fr: {
        common: {
            search: "Rechercher",
            viewProfile: "Voir le profil",
            adminUser: "Administrateur",
            logout: "Déconnexion",
        },
        sidebar: {
            dashboard: "Tableau de bord",
            calendar: "Calendrier",
            jobs: "Jobs", // Often kept as Jobs or Tâches/Travaux. Keeping Jobs for now as it's common in SaaS.
            quotes: "Devis",
            invoices: "Factures",
            clients: "Clients",
            technicians: "Techniciens",
            products: "Produits",
            commissions: "Commissions",
            reports: "Rapports",
            timesheets: "Feuilles de temps",
            settings: "Paramètres",
        },
        divisions: {
            extermination: "Extermination",
            entreprises: "Entreprises",
        },
        jobDetails: {
            title: "Détails du Job",
            backToCalendar: "Retour au calendrier",
            locationClient: "Lieu & Client",
            client: "Client",
            property: "Propriété",
            accessInfo: "Info d'accès",
            schedule: "Horaire",
            dateTime: "Date & Heure",
            technician: "Technicien",
            description: "Description",
            notes: "Notes",
            photos: "Photos",
            products: "Produits",
            financials: "Finances",
            noDescription: "Aucune description",
        }
    }
};

export type Dictionary = typeof dictionary.en;
