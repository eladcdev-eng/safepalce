"use client";

import { useState } from "react";
import Recorder from "./Recorder";
import SessionWorkspace from "./SessionWorkspace";
import { transcribeAudio, generateSummary, generateBrief } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { createGroupedSession } from "@/lib/patients";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Mic } from "lucide-react";

interface SessionFlowProps {
    patientId: string;
    onComplete: () => void;
    onCancel: () => void;
}

export default function SessionFlow({ patientId, onComplete, onCancel }: SessionFlowProps) {
    const [step, setStep] = useState<'recording' | 'processing' | 'workspace'>('recording');
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [recordings, setRecordings] = useState<{ transcript: string }[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState("");
    const [summary, setSummary] = useState("");
    const [summaryBrief, setSummaryBrief] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAudioSaved = async (blob: Blob | File) => {
        setStep('processing');
        setIsLoading(true);

        try {
            const transcriptRes = await transcribeAudio(blob);
            if (transcriptRes.error) throw new Error(transcriptRes.error);
            
            const newTranscript = transcriptRes.text;
            setCurrentTranscript(newTranscript);
            
            // Add to recordings list
            const updatedRecordings = [...recordings, { transcript: newTranscript }];
            setRecordings(updatedRecordings);

            // Combine all transcripts for summary
            const combinedTranscript = updatedRecordings.map(r => r.transcript).join("\n\n");

            // Generate Summary based on combined text
            const summaryRes = await generateSummary(combinedTranscript);
            if (summaryRes.error) throw new Error(summaryRes.error);
            setSummary(summaryRes.text);

            // Generate Brief
            const briefRes = await generateBrief(summaryRes.text);
            if (!briefRes.error) {
                setSummaryBrief(briefRes.text);
            }

            setStep('workspace');
        } catch (err: any) {
            console.error(err);
            alert(`שגיאה בעיבוד המידע: ${err.message || "בדקי את החיבור"}`);
            setStep('recording');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAnother = () => {
        setStep('recording');
        setCurrentTranscript("");
    };

    const handleFinalSave = async (finalSummary: string) => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            await createGroupedSession(
                patientId,
                user.id,
                sessionDate,
                recordings,
                finalSummary,
                summaryBrief
            );

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
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl md:text-2xl font-bold text-[var(--primary)]">תהליך מפגש חכם</h2>
                        <div className="hidden sm:flex items-center gap-2 bg-[var(--primary-container)] px-3 py-1.5 rounded-xl border border-[var(--primary)]/10">
                            <span className="text-xs font-bold text-[var(--primary)]">תאריך המפגש:</span>
                            <input
                                type="date"
                                value={sessionDate}
                                onChange={(e) => setSessionDate(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-[var(--primary)] focus:ring-0 p-0"
                            />
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <Plus className="rotate-45 text-slate-500" size={24} />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <AnimatePresence mode="wait">
                    {step === 'recording' && (
                        <motion.div
                            key="recording"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="h-full flex flex-col items-center justify-center"
                        >
                            <div className="mb-8 text-center">
                                <h3 className="text-2xl font-black mb-2">
                                    {recordings.length > 0 ? `הקלטה מספר ${recordings.length + 1}` : 'התחלת הקלטת מפגש'}
                                </h3>
                                <p className="text-slate-500 font-medium">
                                    {recordings.length > 0 ? 'תוכלי להוסיף כמה הקלטות שתרצי לאותו סיכום' : 'הקליטי את מהלך המפגש, ה-AI יסכם הכל עבורך'}
                                </p>
                            </div>
                            <Recorder onSave={handleAudioSaved} onCancel={onCancel} />
                            
                            {recordings.length > 0 && (
                                <div className="mt-12 w-full max-w-md">
                                    <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">הקלטות קודמות במפגש זה:</h4>
                                    <div className="space-y-2">
                                        {recordings.map((_, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                    <Check size={16} />
                                                </div>
                                                <span className="font-bold text-slate-700">הקלטה {i + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 'processing' && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center gap-6"
                        >
                            <div className="w-20 h-20 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-2">מעבד את המידע...</h3>
                                <p className="text-slate-500">ה-AI מתמלל ומסכם את ההקלטה האחרונה</p>
                            </div>
                        </motion.div>
                    )}

                    {step === 'workspace' && (
                        <motion.div
                            key="workspace"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="h-full flex flex-col"
                        >
                            <div className="max-w-6xl mx-auto w-full mb-6 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">סיכום המפגש</h3>
                                    <p className="text-sm text-slate-500">מבוסס על {recordings.length} הקלטות</p>
                                </div>
                                <button
                                    onClick={handleAddAnother}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--primary)] text-[var(--primary)] rounded-xl font-bold hover:bg-[var(--primary-container)] transition-all"
                                >
                                    <Mic size={18} />
                                    הוספת הקלטה נוספת למפגש
                                </button>
                            </div>
                            <SessionWorkspace
                                transcript={recordings.map(r => r.transcript).join("\n\n---\n\n")}
                                summary={summary}
                                onSave={handleFinalSave}
                                isLoading={isLoading}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
