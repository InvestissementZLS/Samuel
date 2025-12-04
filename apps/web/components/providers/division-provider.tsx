"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Division = "EXTERMINATION" | "ENTREPRISES";

interface DivisionContextType {
    division: Division;
    setDivision: (division: Division) => void;
}

const DivisionContext = createContext<DivisionContextType | undefined>(undefined);

export function DivisionProvider({ children }: { children: React.ReactNode }) {
    const [division, setDivisionState] = useState<Division>("EXTERMINATION");

    useEffect(() => {
        const stored = localStorage.getItem("division");
        if (stored === "EXTERMINATION" || stored === "ENTREPRISES") {
            setDivisionState(stored);
        }
    }, []);

    const setDivision = (div: Division) => {
        setDivisionState(div);
        localStorage.setItem("division", div);
    };

    return (
        <DivisionContext.Provider value={{ division, setDivision }}>
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
