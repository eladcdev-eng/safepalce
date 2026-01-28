"use client";

import { ArrowRight, Mic, Calendar, FileText, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import SessionFlow from "@/components/SessionFlow";
import { supabase } from "@/lib/supabase";
import { Patient } from "@/lib/patients";

export default function PatientDetail() {
    const { id } = useParams();
    const [isRecordingSession, setIsRecordingSession] = useState(false);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                <button className="p-2 bg-[var(--surface-variant)] rounded-full">
                    <Calendar size={20} />
                </button>
            </header>

            <main className="max-w-4xl mx-auto">
                <div className="glass-card p-8 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-right">
                    <div className="w-24 h-24 bg-[var(--primary-container)] text-[var(--primary)] rounded-3xl flex items-center justify-center font-bold text-4xl">
                        {patient.first_name[0]}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold mb-2">{patient.first_name} {patient.last_name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-[var(--secondary)]">
                            {patient.birth_date && <span>ת.לידה: {new Date(patient.birth_date).toLocaleDateString('he-IL')}</span>}
                            <span>•</span>
                            <span>הצטרפות: {new Date(patient.created_at).toLocaleDateString('he-IL')}</span>
                        </div>
                        <p className="mt-4 text-[var(--outline)] max-w-2xl">
                            {patient.notes || "אין הערות קליניות רשומות."}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsRecordingSession(true)}
                        className="primary-button flex items-center gap-2 h-fit"
                    >
                        <Mic size={18} />
                        הקלט סיכום טיפול
                    </button>
                </div>

                <section>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <FileText size={22} className="text-[var(--primary)]" />
                        היסטוריית מפגשים
                    </h2>

                    <div className="space-y-4">
                        {sessions.map((session, i) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-[var(--surface)] border border-[var(--surface-variant)] p-4 rounded-2xl flex items-center justify-between hover:border-[var(--primary)] transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--surface-variant)] rounded-xl flex items-center justify-center text-[var(--primary)]">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">מפגש מיום {new Date(session.session_date).toLocaleDateString('he-IL')}</h3>
                                        <p className="text-xs text-[var(--secondary)]">
                                            {new Date(session.session_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-sm font-semibold">צפה בסיכום</span>
                                    <ChevronLeft size={16} />
                                </div>
                            </motion.div>
                        ))}
                        {sessions.length === 0 && (
                            <div className="py-12 text-center text-[var(--outline)] bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--surface-variant)]">
                                טרם הוקלטו מפגשים למטופל זה.
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
