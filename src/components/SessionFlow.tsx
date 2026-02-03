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
//בדיקהגדגד@@
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
        } catch (err: any) {
            console.error(err);
            alert(`שגיאה בעיבוד המידע: ${err.message || "בדקי את החיבור"}`);
            setStep('recording');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalSave = async (finalSummary: string) => {
        setIsLoading(true);
        try {
            // Save to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .insert([{
                    patient_id: patientId,
                    therapist_id: user?.id,
                    session_date: new Date().toISOString()
                }])
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
        <div className="fixed inset-0 bg-slate-50/95 backdrop-blur-xl z-[60] flex flex-col overflow-hidden">
            <header className="p-4 md:p-6 border-b border-slate-200 bg-white/50 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <h2 className="text-xl md:text-2xl font-bold text-[var(--primary)]">תהליך מפגש חכם</h2>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-[var(--secondary)]"
                    >
                        {step === 'recording' ? 'ביטול' : 'סגור'}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'recording' && (
                        <motion.div
                            key="recording"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="h-full flex items-center justify-center p-4 md:p-0"
                        >
                            <div className="w-full max-w-md">
                                <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">הקלטת סיכום טיפול</h2>
                                <Recorder onSave={handleAudioSaved} onCancel={onCancel} />
                            </div>
                        </motion.div>
                    )}

                    {step === 'processing' && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="w-20 h-20 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-6" />
                            <h2 className="text-2xl font-bold mb-2">מעבד מידע...</h2>
                            <p className="text-[var(--secondary)]">ה-AI שלנו מתמלל ומנסח סיכום מקצועי בשבילך.</p>
                        </motion.div>
                    )}

                    {step === 'workspace' && (
                        <motion.div
                            key="workspace"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="min-h-full py-6 md:py-8"
                        >
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
