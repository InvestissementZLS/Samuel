"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
const setDivisionCookie = async (...args: any) => {};
import { useRouter } from "next/navigation";
import { useUser } from "@/components/providers/user-provider";

type Division = "EXTERMINATION" | "ENTREPRISES" | "RENOVATION";

interface DivisionContextType {
    division: Division;
    setDivision: (division: Division) => void;
}

const DivisionContext = createContext<DivisionContextType | undefined>(undefined);

export function DivisionProvider({ children }: { children: React.ReactNode }) {
    const [division, setDivisionState] = useState<Division>("EXTERMINATION");
    const router = useRouter();

    const { user } = useUser();

    useEffect(() => {
        let stored = localStorage.getItem("division") as Division | null;
        
        // Validation logic to ensure the user has access to the stored or default division
        let allowedDivisions: Division[] = [];
        
        if (user) {
            // @ts-ignore
            if (user.canManageDivisions) {
                allowedDivisions = ["EXTERMINATION", "ENTREPRISES", "RENOVATION"];
            } else {
                // @ts-ignore
                if (user.accesses && user.accesses.length > 0) {
                    // @ts-ignore
                    allowedDivisions = user.accesses.map(a => a.division);
                } else {
                    // @ts-ignore
                    allowedDivisions = user.divisions || ["EXTERMINATION"];
                }
            }
        } else {
             allowedDivisions = ["EXTERMINATION", "ENTREPRISES", "RENOVATION"];
        }

        if (stored && allowedDivisions.includes(stored)) {
            setDivisionState(stored);
        } else if (allowedDivisions.length > 0) {
            // Forcefully set to their first allowed division to prevent getting stuck in restricted context
            setDivisionState(allowedDivisions[0]);
            localStorage.setItem("division", allowedDivisions[0]);
            setDivisionCookie(allowedDivisions[0]);
        }
    }, [user]);

    const setDivision = React.useCallback(async (div: Division) => {
        setDivisionState(div);
        localStorage.setItem("division", div);
        
        // Use the Server Action to definitively set the cookie for NextJS App Router
        await setDivisionCookie(div);
        
        // This will forcefully refresh the Server Components with the new cookie
        // and avoid the jarring visual "flash" of window.location.reload()
        router.refresh();
    }, [router]);

    const contextValue = React.useMemo(() => ({ division, setDivision }), [division, setDivision]);

    return (
        <DivisionContext.Provider value={contextValue}>
            {children}
        </DivisionContext.Provider>
    );
}

export function useDivision() {
    const context = useContext(DivisionContext);
    if (context === undefined) {
        throw new Error("useDivision must be used within a DivisionProvider");
    }
    return context;
}
