'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SignatureCanvas from 'react-signature-canvas';
import { completeJob } from '@/app/actions/report-actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/language-provider';

interface CompleteJobDialogProps {
    jobId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function CompleteJobDialog({ jobId, isOpen, onClose }: CompleteJobDialogProps) {
    const [reportNotes, setReportNotes] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { t } = useLanguage();

    const techSigRef = useRef<SignatureCanvas>(null);
    const clientSigRef = useRef<SignatureCanvas>(null);

    const handleClearTech = () => techSigRef.current?.clear();
    const handleClearClient = () => clientSigRef.current?.clear();

    const handleSubmit = async () => {
        if (techSigRef.current?.isEmpty()) {
            toast.error(t.jobs.signatureRequired);
            return;
        }

        setIsSubmitting(true);
        try {
            const techSig = techSigRef.current?.getTrimmedCanvas().toDataURL('image/png');
            const clientSig = clientSigRef.current?.isEmpty() ? undefined : clientSigRef.current?.getTrimmedCanvas().toDataURL('image/png');

            const result = await completeJob(jobId, {
                reportNotes,
                internalNotes,
                technicianSignature: techSig,
                clientSignature: clientSig,
            });

            if (result.success) {
                toast.success(t.jobs.compAndReport);
                onClose();
                router.refresh();
            } else {
                toast.error(t.jobs.compError + ": " + result.error);
            }
        } catch (error) {
            toast.error(t.jobs.unexpectedError);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.jobs.completeTitle}
            maxWidth="max-w-2xl"
        >
            <div className="mb-4 text-sm text-gray-500">
                {t.jobs.reviewNotes}
            </div>

            <div className="space-y-6 py-4">
                {/* Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="reportNotes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t.jobs.reportNotes}
                        </label>
                        <Textarea
                            id="reportNotes"
                            placeholder={t.jobs.reportNotesPlaceholder}
                            value={reportNotes}
                            onChange={(e) => setReportNotes(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="internalNotes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t.jobs.internalNotes}
                        </label>
                        <Textarea
                            id="internalNotes"
                            placeholder={t.jobs.internalNotesPlaceholder}
                            value={internalNotes}
                            onChange={(e) => setInternalNotes(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Technician Signature */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t.jobs.techSignature} *
                            </label>
                            <Button variant="ghost" size="sm" onClick={handleClearTech} className="h-6 text-xs text-red-500">{t.jobs.clear}</Button>
                        </div>
                        <div className="border rounded-md shadow-sm bg-gray-50 h-40 w-full overflow-hidden">
                            <SignatureCanvas
                                ref={techSigRef}
                                canvasProps={{ className: 'w-full h-full' }}
                                backgroundColor="rgba(0,0,0,0)"
                            />
                        </div>
                    </div>

                    {/* Client Signature */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t.jobs.clientSignature}
                            </label>
                            <Button variant="ghost" size="sm" onClick={handleClearClient} className="h-6 text-xs text-red-500">{t.jobs.clear}</Button>
                        </div>
                        <div className="border rounded-md shadow-sm bg-gray-50 h-40 w-full overflow-hidden">
                            <SignatureCanvas
                                ref={clientSigRef}
                                canvasProps={{ className: 'w-full h-full' }}
                                backgroundColor="rgba(0,0,0,0)"
                            />
                        </div>
                        <p className="text-xs text-gray-500">{t.jobs.optionalSignature}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>{t.common.cancel}</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t.jobs.processing}
                        </>
                    ) : (
                        t.jobs.complete
                    )}
                </Button>
            </div>
        </Modal>
    );
}
