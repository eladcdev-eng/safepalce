"use client";

import { useState } from "react";
import { FileText, Sparkles, Save, Edit3, CheckCircle2 } from "lucide-react";
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

    return (
        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto p-4">
            {/* Transcript Column */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 glass-card p-6 flex flex-col"
            >
                <div className="flex items-center gap-2 mb-4 text-[var(--secondary)]">
                    <FileText size={20} />
                    <h3 className="font-bold">תמליל גולמי (STT)</h3>
                </div>
                <div className="flex-1 bg-white/50 rounded-2xl p-4 overflow-y-auto max-h-[500px] border border-[var(--surface-variant)] text-sm leading-relaxed whitespace-pre-wrap">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-4">
                            <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                            <p className="text-[var(--outline)] animate-pulse">מתמלל את ההקלטה...</p>
                        </div>
                    ) : (
                        transcript || "כאן יופיע התמליל הגולמי לאחר ההקלטה..."
                    )}
                </div>
            </motion.div>

            {/* Summary Column */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 glass-card p-6 flex flex-col border-2 border-[var(--primary-container)]"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                        <Sparkles size={20} className="fill-[var(--primary)]" />
                        <h3 className="font-bold">סיכום טיפולי חכם</h3>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-2 hover:bg-[var(--primary-container)] rounded-xl transition-colors text-[var(--primary)]"
                    >
                        {isEditing ? <CheckCircle2 size={20} /> : <Edit3 size={20} />}
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-4">
                            <div className="w-12 h-12 bg-[var(--primary-container)] rounded-full flex items-center justify-center">
                                <Sparkles size={24} className="text-[var(--primary)] animate-pulse" />
                            </div>
                            <p className="text-[var(--primary)] font-medium">מנסח סיכום מקצועי...</p>
                        </div>
                    ) : isEditing ? (
                        <textarea
                            value={editedSummary}
                            onChange={(e) => setEditedSummary(e.target.value)}
                            className="flex-1 w-full bg-white rounded-2xl p-4 border border-[var(--primary)] focus:outline-none text-sm leading-relaxed min-h-[300px]"
                            dir="rtl"
                        />
                    ) : (
                        <div className="flex-1 bg-[var(--primary-container)]/20 rounded-2xl p-6 overflow-y-auto max-h-[500px] border border-[var(--primary-container)]/30 text-sm leading-relaxed whitespace-pre-wrap prose prose-sm prose-purple">
                            {editedSummary || "לאחר התמלול, הבינה המלאכותית תנסח כאן סיכום טיפולי מקצועי..."}
                        </div>
                    )}

                    <button
                        onClick={() => onSave(editedSummary)}
                        disabled={isLoading || !editedSummary}
                        className="w-full primary-button flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} />
                        שמור בתיק המטופל
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
