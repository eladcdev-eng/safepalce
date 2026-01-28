"use client";

import { useState, useEffect } from "react";
import { FileText, Sparkles, Save, Edit3, CheckCircle2, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";

interface SessionWorkspaceProps {
    transcript: string;
    summary: string;
    onSave: (finalSummary: string) => void;
    isLoading?: boolean;
}

export default function SessionWorkspace({ transcript, summary: initialSummary, onSave, isLoading }: SessionWorkspaceProps) {
    const [editedSummary, setEditedSummary] = useState(initialSummary);
    const [isEditing, setIsEditing] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(editedSummary);
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // Sync state with incoming summary from parent (once AI finishes)
    useEffect(() => {
        if (initialSummary) {
            setEditedSummary(initialSummary);
        }
    }, [initialSummary]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 w-full max-w-6xl mx-auto p-2 md:p-4 pb-12">
            {/* Transcript Column */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 glass-card p-5 md:p-6 flex flex-col min-h-[300px] lg:min-h-0"
            >
                <div className="flex items-center gap-2 mb-4 text-[var(--text-secondary)]">
                    <FileText size={18} />
                    <h3 className="font-bold text-base md:text-lg">תמליל גולמי (STT)</h3>
                </div>
                <div className="flex-1 bg-[var(--background)] rounded-2xl p-4 overflow-y-auto max-h-[300px] lg:max-h-[500px] border border-[var(--surface-variant)] text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-4">
                            <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium animate-pulse">מתמלל את ההקלטה...</p>
                        </div>
                    ) : (
                        transcript || "כאן יופיע התמליל הגולמי לאחר ההקלטה..."
                    )}
                </div>
            </motion.div>

            {/* Summary Column */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 glass-card p-5 md:p-6 flex flex-col border-2 border-[var(--primary-container)] bg-[var(--surface)] shadow-xl"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                        <Sparkles size={18} className="fill-[var(--primary)]" />
                        <h3 className="font-bold text-base md:text-lg">סיכום טיפולי חכם</h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            disabled={!editedSummary}
                            className={`p-2.5 rounded-xl transition-all border ${isCopying ? 'bg-green-500/10 border-green-500 text-green-600' : 'hover:bg-[var(--primary-container)] border-transparent text-[var(--primary)]'}`}
                            title="העתק ללוח"
                        >
                            {isCopying ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-2.5 hover:bg-[var(--primary-container)] rounded-xl transition-colors text-[var(--primary)]"
                        >
                            {isEditing ? <CheckCircle2 size={20} /> : <Edit3 size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-5 text-right">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                            <div className="w-14 h-14 bg-[var(--primary-container)] rounded-full flex items-center justify-center shadow-inner">
                                <Sparkles size={24} className="text-[var(--primary)] animate-pulse" />
                            </div>
                            <p className="text-[var(--primary)] font-bold animate-pulse">מנסח סיכום מקצועי...</p>
                        </div>
                    ) : isEditing ? (
                        <textarea
                            value={editedSummary}
                            onChange={(e) => setEditedSummary(e.target.value)}
                            className="flex-1 w-full bg-[var(--background)] text-[var(--text-primary)] rounded-2xl p-4 border-2 border-[var(--primary-container)] focus:border-[var(--primary)] focus:outline-none text-base leading-relaxed min-h-[350px] lg:min-h-[450px] shadow-inner"
                            dir="rtl"
                            placeholder="ערכי כאן את הסיכום..."
                        />
                    ) : (
                        <div className="flex-1 bg-[var(--primary-container)]/20 rounded-2xl p-6 overflow-y-auto max-h-[400px] lg:max-h-[500px] border border-[var(--primary-container)]/30 text-base leading-relaxed whitespace-pre-wrap text-[var(--text-primary)] font-medium">
                            {editedSummary || "לאחר התמלול, הבינה המלאכותית תנסח כאן סיכום טיפולי מקצועי..."}
                        </div>
                    )}

                    <button
                        onClick={() => onSave(editedSummary)}
                        disabled={isLoading || !editedSummary}
                        className="w-full primary-button flex items-center justify-center gap-3 py-4 shadow-lg shadow-[var(--primary)]/30 disabled:opacity-50 active:scale-95 text-base"
                    >
                        <Save size={20} />
                        שמור בתיק המטופל
                    </button>
                </div>
            </motion.div >
        </div >
    );
}
