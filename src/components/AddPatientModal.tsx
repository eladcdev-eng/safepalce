"use client";

import { useState, useEffect } from "react";
import { X, User, FileText, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (patient: any) => void;
    initialData?: any;
    title?: string;
}

export default function AddPatientModal({ isOpen, onClose, onAdd, initialData, title }: AddPatientModalProps) {
    const [formData, setFormData] = useState({
        first_name: initialData?.first_name || "",
        last_name: initialData?.last_name || "",
        notes: initialData?.notes || "",
    });

    // Reset form when initialData changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                first_name: initialData?.first_name || "",
                last_name: initialData?.last_name || "",
                notes: initialData?.notes || "",
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(formData);
        if (!initialData) {
            setFormData({ first_name: "", last_name: "", notes: "" });
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--surface-variant)] rounded-3xl shadow-2xl overflow-hidden mt-auto sm:mt-0 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-[var(--surface-variant)] flex justify-between items-center bg-[var(--primary-container)]/30">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                                <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white">
                                    <User size={18} />
                                </div>
                                {title || (initialData ? "עריכת פרטי מטופל" : "מטופל חדש")}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors text-[var(--text-secondary)]">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[var(--surface)]">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-[var(--text-secondary)] mr-1">שם פרטי</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full bg-[var(--surface-variant)] text-[var(--text-primary)] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                        placeholder="ישראל"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-[var(--text-secondary)] mr-1">שם משפחה</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full bg-[var(--surface-variant)] text-[var(--text-primary)] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                        placeholder="ישראלי"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[var(--text-secondary)] mr-1 flex items-center gap-2">
                                    <FileText size={16} className="text-[var(--primary)]" />
                                    הערות כלליות
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-[var(--surface-variant)] text-[var(--text-primary)] border-none rounded-2xl p-4 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all resize-none"
                                    placeholder="לדוגמה: רקע טיפולי, חומרים מועדפים..."
                                />
                            </div>

                            <button type="submit" className="w-full primary-button flex items-center justify-center gap-2 mt-2">
                                <Save size={18} />
                                {initialData ? "שמירת שינויים" : "שמירת פרטי מטופל"}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
