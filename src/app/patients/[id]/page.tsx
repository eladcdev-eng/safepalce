"use client";

import { ArrowRight, Mic, Calendar, FileText, ChevronLeft, X, Edit3, Trash2, Copy, Check, Save, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import SessionFlow from "@/components/SessionFlow";
import AddPatientModal from "@/components/AddPatientModal";
import { supabase } from "@/lib/supabase";
import { Patient, updatePatient, deletePatient, updateSummary, updateSummaryBrief, deleteSession, updateSessionDate, mergeSessions } from "@/lib/patients";

export default function PatientDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [isRecordingSession, setIsRecordingSession] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [allSessionsRaw, setAllSessionsRaw] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [isEditingSummary, setIsEditingSummary] = useState(false);
    const [editedSummaryText, setEditedSummaryText] = useState("");
    const [isCopying, setIsCopying] = useState(false);
    const [allAffiliations, setAllAffiliations] = useState<string[]>([]);
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
    const [isShowRawTranscript, setIsShowRawTranscript] = useState(false);

    const isFetchingRef = useRef(false);

    useEffect(() => {
        if (!id) return;

        let isMounted = true;

        const verifyAndFetch = async () => {
            console.log("DEBUG: verifyAndFetch started, id:", id);
            if (isFetchingRef.current) {
                console.log("DEBUG: Already fetching, skipping");
                return;
            }
            isFetchingRef.current = true;

            try {
                console.log("DEBUG: Getting session...");
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                console.log("DEBUG: Session result:", { hasSession: !!session, error: sessionError });

                if (!isMounted) {
                    console.log("DEBUG: Component unmounted during session check");
                    return;
                }

                if (session?.user) {
                    console.log("DEBUG: Session found, fetching patient data");
                    await fetchPatientData();
                } else {
                    console.log("DEBUG: No session, checking getUser...");
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    console.log("DEBUG: getUser result:", { hasUser: !!user, error: userError });

                    if (user) {
                        console.log("DEBUG: User found via getUser, fetching patient data");
                        await fetchPatientData();
                    } else {
                        console.log("DEBUG: No user found, redirecting to /");
                        router.replace('/');
                    }
                }
            } catch (err) {
                console.error("DEBUG: Patient Detail: Verification error", err);
                if (isMounted) setIsLoading(false);
            } finally {
                isFetchingRef.current = false;
                console.log("DEBUG: verifyAndFetch finished");
            }
        };

        verifyAndFetch();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("DEBUG: onAuthStateChange event:", event, "hasSession:", !!session);
            if (!isMounted) return;
            if (event === 'SIGNED_OUT') {
                router.replace('/');
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    console.log("DEBUG: Auth state change triggered fetch");
                    verifyAndFetch();
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [id]);
    //workss
    const fetchPatientData = async () => {
        console.log("DEBUG: fetchPatientData started for id:", id);
        try {
            const { data: pData, error: pError } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single();

            if (pError) {
                console.error("DEBUG: Patient fetch error:", pError);
                throw pError;
            }
            console.log("DEBUG: Patient data received:", pData?.id);
            setPatient(pData);

            const { data: sData, error: sError } = await supabase
                .from('sessions')
                .select(`
                    id,
                    session_date,
                    parent_session_id,
                    summaries (summary_text, summary_brief, raw_transcript),
                    transcripts (raw_text)
                `)
                .eq('patient_id', id)
                .order('session_date', { ascending: false });

            if (sError) {
                console.error("DEBUG: Sessions fetch error:", sError);
                throw sError;
            }
            console.log("DEBUG: Sessions data received, count:", sData?.length);
            setAllSessionsRaw(sData || []);
            // Filter to only show master sessions in the list
            const masterSessions = sData?.filter(s => !s.parent_session_id) || [];
            setSessions(masterSessions);

            // Fetch all patients to get all unique affiliations for the modal
            const { data: allPatients } = await supabase.from('patients').select('affiliation');
            if (allPatients) {
                const affiliations = Array.from(new Set(allPatients.map(p => p.affiliation).filter(Boolean) as string[]));
                setAllAffiliations(affiliations);
            }
        } catch (err) {
            console.error("DEBUG: Error fetching patient data:", err);
        } finally {
            setIsLoading(false);
            console.log("DEBUG: fetchPatientData finished, isLoading set to false");
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
            setSelectedSession({
                ...selectedSession,
                summaries: [{ summary_text: editedSummaryText }]
            });
        } catch (err) {
            console.error("Error saving summary:", err);
            alert("שגיאה בשמירת הסיכום");
        }
    };

    const handleGenerateBrief = async (sessionId: string, summaryText: string) => {
        try {
            const { generateBrief } = await import("@/lib/ai");
            const briefRes = await generateBrief(summaryText);
            if (briefRes.error) throw new Error(briefRes.error);

            await updateSummaryBrief(sessionId, briefRes.text);
            fetchPatientData();
            if (selectedSession && selectedSession.id === sessionId) {
                setSelectedSession({
                    ...selectedSession,
                    summaries: [{ ...selectedSession.summaries[0], summary_brief: briefRes.text }]
                });
            }
        } catch (err) {
            console.error("Error generating brief:", err);
            alert("שגיאה ביצירת התמצית");
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

    const handleUpdateSessionDate = async (sessionId: string, newDate: string) => {
        try {
            await updateSessionDate(sessionId, newDate);
            fetchPatientData();
        } catch (err) {
            console.error("Error updating session date:", err);
            alert("שגיאה בעדכון תאריך המפגש");
        }
    };

    const toggleFolder = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setExpandedFolders(prev =>
            prev.includes(sessionId)
                ? prev.filter(id => id !== sessionId)
                : [...prev, sessionId]
        );
    };

    const handleMergeSessions = async () => {
        if (selectedForMerge.length < 2) {
            alert("יש לבחור לפחות שני מפגשים למיזוג");
            return;
        }

        if (confirm(`האם למזג ${selectedForMerge.length} מפגשים למפגש אחד? המפגש הראשון שנבחר יהיה המפגש הראשי.`)) {
            try {
                const [masterId, ...subIds] = selectedForMerge;
                await mergeSessions(masterId, subIds);
                setIsMergeMode(false);
                setSelectedForMerge([]);
                fetchPatientData();
            } catch (err) {
                console.error("Error merging sessions:", err);
                alert("שגיאה במיזוג המפגשים");
            }
        }
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-[var(--text-secondary)] font-bold text-lg animate-pulse">טוען את תיק המטופל...</p>
        </div>
    );

    if (!patient) return <div className="p-8 text-center">מטופל לא נמצא.</div>;

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24">
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
            <header className="max-w-4xl mx-auto flex justify-between items-center mb-10 glass-card p-4 md:p-5 sticky top-4 z-40">
                <Link href="/" className="flex items-center gap-2 text-[var(--primary)] hover:opacity-80 transition-all font-bold">
                    <ArrowRight size={20} />
                    <span>חזרה לדשבורד</span>
                </Link>
                <div className="flex gap-2 md:gap-3">
                    <Link
                        href={`/invoice-proforma?customer=${encodeURIComponent(patient.affiliation || `${patient.first_name} ${patient.last_name}`)}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary-container)] text-[var(--primary)] rounded-2xl hover:bg-[var(--primary)] hover:text-white transition-all font-bold text-sm shadow-sm"
                        title="יצירת חשבונית עסקה"
                    >
                        <FileText size={18} />
                        <span className="hidden sm:inline">חשבונית</span>
                    </Link>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2.5 hover:bg-[var(--surface-variant)] rounded-2xl transition-all text-[var(--outline)] border border-transparent hover:border-[var(--surface-variant)]"
                        title="עריכת פרטי מטופל"
                    >
                        <Edit3 size={20} />
                    </button>
                    <button
                        onClick={handleDeletePatient}
                        className="p-2.5 hover:bg-red-50 rounded-2xl transition-all text-red-500 border border-transparent hover:border-red-100"
                        title="מחיקת מטופל"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto">
                <div className="glass-card p-4 md:p-10 mb-8 md:mb-10 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-right relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[var(--primary)] to-[var(--accent)]" />

                    <div className="w-24 h-24 md:w-32 md:h-32 bg-[var(--primary-container)] text-[var(--primary)] rounded-[40px] flex items-center justify-center font-black text-4xl md:text-5xl shadow-inner">
                        {patient.first_name[0]}
                    </div>
                    <div className="flex-1 w-full">
                        <h1 className="text-3xl md:text-4xl font-black mb-3 text-[var(--text-primary)]">{patient.first_name} {patient.last_name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-bold text-[var(--primary)] opacity-70">
                            {patient.birth_date && <span>ת.לידה: {new Date(patient.birth_date).toLocaleDateString('he-IL')}</span>}
                            <span className="hidden xs:inline opacity-30">•</span>
                            <span>הצטרפות: {new Date(patient.created_at).toLocaleDateString('he-IL')}</span>
                        </div>
                        {patient.affiliation && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-container)]/30 text-[var(--accent)] rounded-lg text-sm font-bold border border-[var(--accent-container)]">
                                <Sparkles size={14} />
                                <span>שיוך: {patient.affiliation}</span>
                            </div>
                        )}
                        <p className="mt-6 text-[var(--text-secondary)] text-base md:text-lg leading-relaxed max-w-2xl font-medium">
                            {patient.notes || "אין הערות קליניות רשומות למטופל זה."}
                        </p>

                        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-container)]/50 text-[var(--primary)] rounded-xl text-sm font-bold shadow-sm">
                            <Calendar size={16} />
                            <span>
                                {new Date().toLocaleDateString('he-IL', { month: 'long' })}: {
                                    sessions.filter(s => {
                                        const d = new Date(s.session_date);
                                        const now = new Date();
                                        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                    }).length
                                } מפגשים
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsRecordingSession(true)}
                        className="primary-button w-full md:w-auto flex items-center justify-center gap-3 h-fit py-5 px-10 text-lg"
                    >
                        <Mic size={24} />
                        הקלט סיכום טיפול
                    </button>
                </div>

                <section>
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-[var(--text-primary)]">
                            <div className="w-10 h-10 bg-[var(--primary-container)] rounded-xl flex items-center justify-center text-[var(--primary)]">
                                <FileText size={20} />
                            </div>
                            היסטוריית מפגשים ({sessions.length})
                        </h2>
                        <div className="flex gap-2">
                            {isMergeMode ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsMergeMode(false);
                                            setSelectedForMerge([]);
                                        }}
                                        className="px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        ביטול
                                    </button>
                                    <button
                                        onClick={handleMergeSessions}
                                        disabled={selectedForMerge.length < 2}
                                        className="px-4 py-2 text-sm font-bold bg-[var(--primary)] text-white rounded-xl shadow-md disabled:opacity-50 transition-all"
                                    >
                                        בצע מיזוג ({selectedForMerge.length})
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsMergeMode(true)}
                                    className="px-4 py-2 text-sm font-bold text-[var(--primary)] bg-[var(--primary-container)]/50 rounded-xl hover:bg-[var(--primary-container)] transition-all"
                                >
                                    מיזוג מפגשים
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {sessions.map((session, i) => {
                            const subSessions = allSessionsRaw.filter(s => s.parent_session_id === session.id);
                            const isExpanded = expandedFolders.includes(session.id);

                            return (
                                <div key={session.id} className="flex flex-col gap-2">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => {
                                            if (isMergeMode) {
                                                setSelectedForMerge(prev =>
                                                    prev.includes(session.id)
                                                        ? prev.filter(id => id !== session.id)
                                                        : [...prev, session.id]
                                                );
                                            } else {
                                                setSelectedSession(session);
                                            }
                                        }}
                                        className={`glass-card p-5 md:p-6 flex items-center justify-between cursor-pointer group relative overflow-hidden transition-all ${isMergeMode && selectedForMerge.includes(session.id)
                                            ? 'border-[var(--primary)] bg-[var(--primary-container)]/20 ring-2 ring-[var(--primary)]/20'
                                            : 'border-transparent hover:border-[var(--primary)]/20'
                                            }`}
                                        whileHover={!isMergeMode ? { x: -4 } : {}}
                                    >
                                        {isMergeMode && (
                                            <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${selectedForMerge.includes(session.id)
                                                ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                                : 'border-slate-300 bg-white'
                                                }`}>
                                                {selectedForMerge.includes(session.id) && <Check size={14} />}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 md:gap-6 overflow-hidden flex-1">
                                            <div className="w-12 h-12 bg-[var(--primary-container)] rounded-2xl flex items-center justify-center text-[var(--primary)] flex-shrink-0 shadow-inner relative">
                                                <Calendar size={20} />
                                                {subSessions.length > 0 && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--accent)] text-white rounded-lg flex items-center justify-center shadow-sm border-2 border-white">
                                                        <FileText size={10} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-base md:text-lg text-[var(--text-primary)]">מפגש מיום</h3>
                                                    <input
                                                        type="date"
                                                        value={new Date(session.session_date).toISOString().split('T')[0]}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => handleUpdateSessionDate(session.id, e.target.value)}
                                                        className="bg-[var(--primary-container)] px-2 py-1 rounded-lg text-sm font-black text-[var(--primary)] focus:outline-none cursor-pointer border border-transparent hover:border-[var(--primary)]/20 transition-all"
                                                    />
                                                    {subSessions.length > 0 && (
                                                        <div className="flex items-center gap-2 mr-2">
                                                            <button
                                                                onClick={(e) => toggleFolder(e, session.id)}
                                                                className="px-2 py-1 bg-[var(--primary-container)]/50 hover:bg-[var(--primary-container)] rounded-lg transition-all text-[var(--primary)] text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <Sparkles size={14} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                                                <span>{isExpanded ? 'סגור' : `הצג ${subSessions.length} הקלטות`}</span>
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("האם לפרק את התיקייה? כל ההקלטות יחזרו להיות מפגשים נפרדים.")) {
                                                                        try {
                                                                            await supabase.from('sessions').update({ parent_session_id: null }).eq('parent_session_id', session.id);
                                                                            fetchPatientData();
                                                                        } catch (err) {
                                                                            alert("שגיאה בפירוק התיקייה");
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-1 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                                                                title="פרק תיקייה"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                                                    <p className="text-xs font-bold text-[var(--primary)] opacity-60 flex-shrink-0">
                                                        בשעה {new Date(session.session_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {session.summaries?.[0]?.summary_text && (
                                                        <p className="text-xs text-[var(--text-secondary)] font-medium truncate flex-1 md:max-w-md">
                                                            {session.summaries[0].summary_text}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[var(--primary)] opacity-100 md:opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-4 md:group-hover:translate-x-0">
                                            <span className="text-sm font-black hidden sm:inline">צפייה</span>
                                            <ChevronLeft size={20} />
                                        </div>
                                    </motion.div>

                                    {/* Expanded Sub-sessions */}
                                    <AnimatePresence>
                                        {isExpanded && subSessions.length > 0 && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden pr-12 space-y-2"
                                            >
                                                {subSessions.map((sub, subIdx) => (
                                                    <div
                                                        key={sub.id}
                                                        className="glass-card p-4 flex items-center justify-between border-dashed border-[var(--primary)]/10 bg-white/40"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                                                <Mic size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-600">הקלטה {subIdx + 1}</p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {new Date(sub.session_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 mx-4 overflow-hidden">
                                                            {sub.summaries?.[0]?.summary_text ? (
                                                                <p className="text-[10px] text-[var(--primary)] font-bold truncate">
                                                                    סיכום: {sub.summaries[0].summary_text}
                                                                </p>
                                                            ) : sub.transcripts?.[0]?.raw_text && (
                                                                <p className="text-[10px] text-slate-400 truncate italic">
                                                                    תמלול: "{sub.transcripts[0].raw_text}"
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedSession(sub);
                                                                }}
                                                                className="p-2 hover:bg-[var(--primary-container)] rounded-lg text-[var(--primary)] transition-colors"
                                                                title="צפייה"
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("האם להוציא הקלטה זו מהתיקייה? היא תחזור להיות מפגש נפרד.")) {
                                                                        try {
                                                                            await supabase.from('sessions').update({ parent_session_id: null }).eq('id', sub.id);
                                                                            fetchPatientData();
                                                                        } catch (err) {
                                                                            alert("שגיאה בפירוק המיזוג");
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                                                                title="הוצא מהתיקייה"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                        {sessions.length === 0 && (
                            <div className="py-20 text-center glass-card border-dashed border-2">
                                <div className="w-16 h-16 bg-[var(--surface-variant)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--outline)]">
                                    <Calendar size={32} />
                                </div>
                                <p className="text-xl font-bold text-[var(--text-secondary)]">טרם הוקלטו מפגשים</p>
                                <p className="text-[var(--outline)] mt-2">לחצי על הכפתור למעלה כדי להתחיל תיעוד ראשון</p>
                            </div>
                        )}
                    </div>

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
                                        setIsShowRawTranscript(false);
                                    }}
                                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="relative bg-[var(--surface)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--surface-variant)]"
                                >
                                    <div className="p-6 border-b border-[var(--surface-variant)] flex justify-between items-center bg-[var(--primary-container)]/30">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
                                                <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white">
                                                    <FileText size={18} />
                                                </div>
                                                סיכום מפגש טיפולי
                                            </h3>
                                            <p className="text-sm font-bold text-[var(--primary)] opacity-70 mt-1 mr-10">
                                                {new Date(selectedSession.session_date).toLocaleDateString('he-IL')} | {new Date(selectedSession.session_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {!selectedSession.summaries?.[0]?.summary_brief && selectedSession.summaries?.[0]?.summary_text && (
                                                <button
                                                    onClick={() => handleGenerateBrief(selectedSession.id, selectedSession.summaries[0].summary_text)}
                                                    className="flex items-center gap-2 px-3 py-1 bg-[var(--primary-container)] text-[var(--primary)] rounded-xl text-xs font-bold hover:bg-[var(--primary)] hover:text-white transition-all border border-[var(--primary)]/10"
                                                    title="צור תמצית AI לסיכום זה"
                                                >
                                                    <Sparkles size={14} />
                                                    צור תמצית
                                                </button>
                                            )}
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
                                    <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-[var(--background)] space-y-6">
                                        {!isEditingSummary && selectedSession.summaries?.[0]?.summary_brief && (
                                            <div className="bg-[var(--primary-container)]/50 p-5 rounded-2xl border border-[var(--primary)]/10 relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="bg-[var(--primary)] text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">תמצית AI</span>
                                                    <button
                                                        onClick={() => handleCopySummary(selectedSession.summaries[0].summary_brief)}
                                                        className="text-[var(--primary)] hover:opacity-70 transition-opacity"
                                                        title="העתק תמצית"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-base md:text-lg leading-relaxed text-[var(--text-primary)] font-bold italic">
                                                    "{selectedSession.summaries[0].summary_brief}"
                                                </p>
                                            </div>
                                        )}
                                        {isEditingSummary ? (
                                            <textarea
                                                value={editedSummaryText}
                                                onChange={(e) => setEditedSummaryText(e.target.value)}
                                                className="w-full h-full min-h-[400px] bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl p-6 border-2 border-[var(--primary-container)] focus:border-[var(--primary)] focus:outline-none text-base md:text-lg leading-relaxed shadow-inner"
                                                dir="rtl"
                                                autoFocus
                                            />
                                        ) : (
                                            <>
                                                <div className="bg-[var(--surface)] rounded-3xl p-6 md:p-8 border border-[var(--surface-variant)] shadow-sm min-h-[200px]">
                                                    <div className="whitespace-pre-wrap text-base md:text-lg leading-relaxed text-[var(--text-primary)] font-medium">
                                                        {selectedSession.summaries?.[0]?.summary_text || "אין סיכום זמין למפגש זה."}
                                                    </div>
                                                </div>

                                                {selectedSession.summaries?.[0]?.raw_transcript && (
                                                    <div className="mt-8 border-t border-[var(--surface-variant)] pt-8">
                                                        <button
                                                            onClick={() => setIsShowRawTranscript(!isShowRawTranscript)}
                                                            className="flex items-center gap-2 text-[var(--primary)] font-bold mb-4 hover:opacity-80 transition-all"
                                                        >
                                                            <div className={`p-1 rounded bg-[var(--primary-container)] transition-transform ${isShowRawTranscript ? 'rotate-180' : ''}`}>
                                                                <ChevronLeft size={14} className="rotate-270" />
                                                            </div>
                                                            {isShowRawTranscript ? 'הסתר תמלול גלם' : 'הצג תמלול גלם'}
                                                        </button>

                                                        <AnimatePresence>
                                                            {isShowRawTranscript && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 relative">
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">תמלול גלם (ללא עריכה)</span>
                                                                            <button
                                                                                onClick={() => handleCopySummary(selectedSession.summaries[0].raw_transcript)}
                                                                                className="text-slate-400 hover:text-[var(--primary)] transition-colors"
                                                                                title="העתק תמלול גלם"
                                                                            >
                                                                                <Copy size={16} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="text-sm md:text-base leading-relaxed text-slate-600 whitespace-pre-wrap italic">
                                                                            {selectedSession.summaries[0].raw_transcript}
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </>
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
                        existingAffiliations={allAffiliations}
                    />
                </section>
            </main>
        </div>
    );
}
