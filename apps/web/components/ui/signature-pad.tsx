"use client";

import React, { useRef, useState } from "react";
// @ts-ignore
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
    onSign: (signatureData: string) => void;
}

export function SignaturePad({ onSign }: SignaturePadProps) {
    const sigPad = useRef<any>({});
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigPad.current?.clear();
        setIsEmpty(true);
        onSign("");
    };

    const handleEnd = () => {
        if (sigPad.current) {
            const data = sigPad.current.toDataURL();
            const empty = sigPad.current.isEmpty();
            setIsEmpty(empty);
            if (!empty) {
                onSign(data);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
                <SignatureCanvas
                    ref={sigPad}
                    penColor="black"
                    canvasProps={{
                        className: "w-full h-48 bg-white cursor-crosshair",
                    }}
                    onEnd={handleEnd}
                />
            </div>
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clear}
                    className="text-gray-500"
                >
                    <Eraser className="w-4 h-4 mr-2" />
                    Clear Signature
                </Button>
            </div>
        </div>
    );
}
