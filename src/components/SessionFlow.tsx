"use client";

import { useState } from "react";
import Recorder from "./Recorder";
import SessionWorkspace from "./SessionWorkspace";
import { transcribeAudio, generateSummary } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface SessionFlowProps {
    patientId: string;
    onComplete: () => void;
    onCancel: () => void;
}

export default function SessionFlow({ patientId, onComplete, onCancel }: SessionFlowProps) {
    const [step, setStep] = useState<'recording' | 'processing' | 'workspace'>('recording');
    const [transcript, setTranscript] = useState("");
    const [summary, setSummary] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAudioSaved = async (blob: Blob) => {
        setStep('processing');
        setIsLoading(true);

        try {
            // 1. Upload to Storage (Skipping for now until keys are ready)
            // 2. Transcribe
            const transcriptRes = await transcribeAudio(blob);
            if (transcriptRes.error) throw new Error(transcriptRes.error);
            setTranscript(transcriptRes.text);

            setStep('workspace');

            // 3. Summarize
            const summaryRes = await generateSummary(transcriptRes.text);
            if (summaryRes.error) throw new Error(summaryRes.error);
            setSummary(summaryRes.text);
        } catch (err) {
            console.error(err);
            alert("שגיאה בעיבוד המידע. אנא בדקי את החיבור והנסחי שנית.");
            setStep('recording');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalSave = async (finalSummary: string) => {
        setIsLoading(true);
        try {
            // Save to Supabase
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .insert([{ patient_id: patientId, session_date: new Date().toISOString() }])
                .select()
                .single();

            if (sessionError) throw sessionError;

            await Promise.all([
                supabase.from('transcripts').insert([{ session_id: sessionData.id, raw_text: transcript }]),
                supabase.from('summaries').insert([{ session_id: sessionData.id, summary_text: finalSummary }]),
            ]);

            onComplete();
        } catch (err) {
            console.error(err);
            alert("שגיאה בשמירת הנתונים.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-xl z-50 flex flex-col overflow-y-auto">
            <div className="p-6">
                <AnimatePresence mode="wait">
                    {step === 'recording' && (
                        <motion.div
                            key="recording"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="mt-20"
                        >
                            <h2 className="text-3xl font-bold text-center mb-12">הקלטת סיכום טיפול</h2>
                            <Recorder onSave={handleAudioSaved} onCancel={onCancel} />
                        </motion.div>
                    )}

                    {(step === 'processing' || step === 'workspace') && (
                        <motion.div
                            key="workspace"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8"
                        >
                            <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 px-4">
                                <h2 className="text-2xl font-bold">סיכום ומסקנות</h2>
                                <button onClick={onCancel} className="text-[var(--secondary)]">ביטול</button>
                            </div>
                            <SessionWorkspace
                                transcript={transcript}
                                summary={summary}
                                onSave={handleFinalSave}
                                isLoading={isLoading}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
