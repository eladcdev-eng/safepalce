"use client";

import { useState } from "react";
import { X, User, Calendar, FileText, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (patient: any) => void;
}

export default function AddPatientModal({ isOpen, onClose, onAdd }: AddPatientModalProps) {
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        birth_date: "",
        notes: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(formData);
        setFormData({ first_name: "", last_name: "", birth_date: "", notes: "" });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-[var(--surface-variant)] flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <User className="text-[var(--primary)]" size={20} />
                                מטופל חדש
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-[var(--surface-variant)] rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--secondary)]">שם פרטי</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full bg-[var(--surface)] border border-[var(--surface-variant)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--secondary)]">שם משפחה</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full bg-[var(--surface)] border border-[var(--surface-variant)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[var(--secondary)] flex items-center gap-2">
                                    <Calendar size={16} />
                                    תאריך לידה
                                </label>
                                <input
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--surface-variant)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[var(--secondary)] flex items-center gap-2">
                                    <FileText size={16} />
                                    הערות כלליות
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--surface-variant)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    placeholder="לדוגמה: רקע טיפולי, חומרים מועדפים..."
                                />
                            </div>

                            <button type="submit" className="w-full primary-button flex items-center justify-center gap-2 mt-4">
                                <Save size={18} />
                                שמירת פרטי מטופל
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
