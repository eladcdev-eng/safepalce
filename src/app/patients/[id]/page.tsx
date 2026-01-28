"use client";

import { ArrowRight, Mic, Calendar, FileText, ChevronLeft, X, Edit3, Trash2, Copy, Check, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import SessionFlow from "@/components/SessionFlow";
import AddPatientModal from "@/components/AddPatientModal";
import { supabase } from "@/lib/supabase";
import { Patient, updatePatient, deletePatient, updateSummary, deleteSession } from "@/lib/patients";

export default function PatientDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [isRecordingSession, setIsRecordingSession] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [isEditingSummary, setIsEditingSummary] = useState(false);
    const [editedSummaryText, setEditedSummaryText] = useState("");
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        if (id) {
            fetchPatientData();
        }
    }, [id]);

    const fetchPatientData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log("No user session found, redirecting...");
                window.location.href = "/";
                return;
            }

            const { data: pData, error: pError } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single();

            if (pError) throw pError;
            setPatient(pData);

            const { data: sData, error: sError } = await supabase
                .from('sessions')
                .select(`
                    id,
                    session_date,
                    summaries (summary_text)
                `)
                .eq('patient_id', id)
                .order('session_date', { ascending: false });

            if (sError) throw sError;
            setSessions(sData);
        } catch (err) {
            console.error("Error fetching patient data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePatient = async (patientData: any) => {
        try {
            await updatePatient(id as string, patientData);
            fetchPatientData();
        } catch (err) {
            console.error("Error updating patient:", err);
            alert("שגיאה בעדכון פרטי המטופל");
        }
    };

    const handleDeletePatient = async () => {
        if (confirm(`האם את בטוחה שברצונך למחוק את ${patient?.first_name} ${patient?.last_name}? כל המידע והסיכומים יימחקו לצמיתות.`)) {
            try {
                await deletePatient(id as string);
                router.push('/');
            } catch (err) {
                console.error("Error deleting patient:", err);
                alert("שגיאה במחיקת המטופל");
            }
        }
    };

    const handleCopySummary = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleSaveSummaryEdit = async () => {
        if (!selectedSession) return;
        try {
            await updateSummary(selectedSession.id, editedSummaryText);
            setIsEditingSummary(false);
            fetchPatientData();
            // Update selected session to show new text immediately
            setSelectedSession({
                ...selectedSession,
                summaries: [{ summary_text: editedSummaryText }]
            });
        } catch (err) {
            console.error("Error saving summary:", err);
            alert("שגיאה בשמירת הסיכום");
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (confirm("האם למחוק מפגש זה לצמיתות?")) {
            try {
                await deleteSession(sessionId);
                setSelectedSession(null);
                fetchPatientData();
            } catch (err) {
                console.error("Error deleting session:", err);
                alert("שגיאה במחיקת המפגש");
            }
        }
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!patient) return <div className="p-8 text-center">מטופל לא נמצא.</div>;

    return (
        <div className="min-h-screen bg-[var(--background)] p-6">
            {isRecordingSession && (
                <SessionFlow
                    patientId={id as string}
                    onComplete={() => {
                        setIsRecordingSession(false);
                        fetchPatientData();
                    }}
                    onCancel={() => setIsRecordingSession(false)}
                />
            )}
            <header className="flex justify-between items-center mb-8">
                <Link href="/" className="flex items-center gap-2 text-[var(--secondary)] hover:text-[var(--primary)] transition-colors">
                    <ArrowRight size={20} />
                    <span>חזרה לדשבורד</span>
                </Link>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2.5 bg-white border border-[var(--surface-variant)] text-[var(--secondary)] hover:text-[var(--primary)] rounded-xl transition-all shadow-sm"
                        title="עריכת פרטי מטופל"
                    >
                        <Edit3 size={18} />
                    </button>
                    <button
                        onClick={handleDeletePatient}
                        className="p-2.5 bg-white border border-[var(--surface-variant)] text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                        title="מחיקת מטופל"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto">
                <div className="glass-card p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-right">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[var(--primary-container)] text-[var(--primary)] rounded-3xl flex items-center justify-center font-bold text-3xl md:text-4xl shadow-inner">
                        {patient.first_name[0]}
                    </div>
                    <div className="flex-1 w-full">
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">{patient.first_name} {patient.last_name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 text-xs md:text-sm text-[var(--secondary)]">
                            {patient.birth_date && <span>ת.לידה: {new Date(patient.birth_date).toLocaleDateString('he-IL')}</span>}
                            <span className="hidden xs:inline text-[var(--outline)]">•</span>
                            <span>הצטרפות: {new Date(patient.created_at).toLocaleDateString('he-IL')}</span>
                        </div>
                        <p className="mt-4 text-[var(--secondary)] text-sm md:text-base leading-relaxed max-w-2xl">
                            {patient.notes || "אין הערות קליניות רשומות למטופל זה."}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsRecordingSession(true)}
                        className="primary-button w-full md:w-auto flex items-center justify-center gap-2 h-fit py-4 px-8 shadow-lg shadow-[var(--primary)]/20 active:scale-95"
                    >
                        <Mic size={20} />
                        הקלט סיכום טיפול
                    </button>
                </div>

                <section>
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
                        <FileText size={20} className="text-[var(--primary)]" />
                        היסטוריית מפגשים ({sessions.length})
                    </h2>

                    <div className="space-y-3 md:space-y-4">
                        {sessions.map((session, i) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setSelectedSession(session)}
                                className="bg-[var(--surface)] border border-[var(--surface-variant)] p-4 rounded-2xl flex items-center justify-between hover:border-[var(--primary)]/50 transition-all cursor-pointer active:bg-[var(--surface-variant)] group hover:shadow-md"
                            >
                                <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
                                    <div className="w-10 h-10 md:w-11 md:h-11 bg-[var(--surface-variant)]/50 rounded-xl flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                                        <Calendar size={18} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <h3 className="font-bold text-sm md:text-base truncate">מפגש מיום {new Date(session.session_date).toLocaleDateString('he-IL')}</h3>
                                        <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4">
                                            <p className="text-[10px] md:text-xs text-[var(--outline)] flex-shrink-0">
                                                {new Date(session.session_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {session.summaries?.[0]?.summary_text && (
                                                <p className="text-[10px] md:text-xs text-[var(--primary)] font-medium truncate flex-1 md:max-w-md">
                                                    {session.summaries[0].summary_text.substring(0, 60)}...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[var(--primary)] opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                    <span className="text-xs font-bold hidden xs:inline">צפייה</span>
                                    <ChevronLeft size={16} />
                                </div>
                            </motion.div>
                        ))}
                        {sessions.length === 0 && (
                            <div className="py-16 text-center text-[var(--outline)] bg-white rounded-3xl border border-dashed border-[var(--surface-variant)]">
                                טרם הוקלטו מפגשים למטופל זה.
                            </div>
                        )}
                    </div>

                    {/* Session Detail Modal */}
                    <AnimatePresence>
                        {selectedSession && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => {
                                        setSelectedSession(null);
                                        setIsEditingSummary(false);
                                    }}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="relative bg-[var(--surface)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--surface-variant)]"
                                >
                                    <div className="p-6 border-b border-[var(--surface-variant)] flex justify-between items-center bg-[var(--primary-container)]">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-[var(--primary)] flex items-center gap-2">
                                                <FileText size={20} />
                                                סיכום מפגש טיפולי
                                            </h3>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {new Date(selectedSession.session_date).toLocaleDateString('he-IL')} | {new Date(selectedSession.session_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const text = selectedSession.summaries?.[0]?.summary_text || "";
                                                    handleCopySummary(text);
                                                }}
                                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${isCopying ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-[var(--surface)] border-[var(--surface-variant)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]'}`}
                                            >
                                                {isCopying ? <Check size={18} /> : <Copy size={18} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!isEditingSummary) {
                                                        setEditedSummaryText(selectedSession.summaries?.[0]?.summary_text || "");
                                                    }
                                                    setIsEditingSummary(!isEditingSummary);
                                                }}
                                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${isEditingSummary ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--surface)] border-[var(--surface-variant)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]'}`}
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSession(selectedSession.id)}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--surface-variant)] text-red-500 hover:bg-red-500/10 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedSession(null);
                                                    setIsEditingSummary(false);
                                                }}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--surface-variant)] transition-colors text-[var(--text-secondary)]"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-[var(--background)]">
                                        {isEditingSummary ? (
                                            <textarea
                                                value={editedSummaryText}
                                                onChange={(e) => setEditedSummaryText(e.target.value)}
                                                className="w-full h-full min-h-[400px] bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl p-6 border-2 border-[var(--primary-container)] focus:border-[var(--primary)] focus:outline-none text-base md:text-lg leading-relaxed shadow-inner"
                                                dir="rtl"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="bg-[var(--surface)] rounded-3xl p-6 md:p-8 border border-[var(--surface-variant)] shadow-sm min-h-[200px]">
                                                <div className="whitespace-pre-wrap text-base md:text-lg leading-relaxed text-[var(--text-primary)] font-medium">
                                                    {selectedSession.summaries?.[0]?.summary_text || "אין סיכום זמין למפגש זה."}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6 border-t border-[var(--surface-variant)] flex justify-between items-center bg-[var(--surface)]">
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {isEditingSummary ? "* השינויים יישמרו רק לאחר לחיצה על כפתור השמירה" : ""}
                                        </div>
                                        <div className="flex gap-3">
                                            {isEditingSummary ? (
                                                <>
                                                    <button
                                                        onClick={() => setIsEditingSummary(false)}
                                                        className="px-6 py-2.5 rounded-xl border border-[var(--surface-variant)] text-[var(--text-secondary)] font-bold hover:bg-[var(--surface-variant)] transition-all"
                                                    >
                                                        ביטול
                                                    </button>
                                                    <button
                                                        onClick={handleSaveSummaryEdit}
                                                        className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold hover:opacity-90 transition-all shadow-md shadow-[var(--primary)]/20 flex items-center gap-2"
                                                    >
                                                        <Save size={18} />
                                                        שמירת שינויים
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedSession(null)}
                                                    className="px-8 py-2.5 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-bold hover:opacity-90 transition-all shadow-md"
                                                >
                                                    סגור
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    <AddPatientModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onAdd={handleUpdatePatient}
                        initialData={patient}
                        title="עדכון פרטי מטופל"
                    />
                </section>
            </main>
        </div>
    );
}
