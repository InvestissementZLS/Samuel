"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Division = "EXTERMINATION" | "ENTREPRISES" | "RENOVATION";

interface DivisionContextType {
    division: Division;
    setDivision: (division: Division) => void;
}

const DivisionContext = createContext<DivisionContextType | undefined>(undefined);

export function DivisionProvider({ children }: { children: React.ReactNode }) {
    const [division, setDivisionState] = useState<Division>("EXTERMINATION");

    useEffect(() => {
        const stored = localStorage.getItem("division");
        if (stored === "EXTERMINATION" || stored === "ENTREPRISES" || stored === "RENOVATION") {
            setDivisionState(stored);
        }
    }, []);

    const setDivision = React.useCallback((div: Division) => {
        setDivisionState(div);
        localStorage.setItem("division", div);
    }, []);

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
