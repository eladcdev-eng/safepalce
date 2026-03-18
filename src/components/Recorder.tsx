"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Check, RefreshCw, Edit3, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RecorderProps {
    onSave: (audioData: Blob | File) => void;
    onCancel: () => void;
}

export default function Recorder({ onSave, onCancel }: RecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setAudioBlob(null);
        } catch (err) {
            console.error("Failed to start recording:", err);
            alert("לא ניתן לגשת למיקרופון. אנא בדקי הרשאות.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioBlob(file);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-6 p-8 bg-[var(--surface)] rounded-3xl border border-[var(--surface-variant)] shadow-xl w-full max-w-md mx-auto">
            <div className="relative">
                <AnimatePresence>
                    {isRecording && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="absolute -inset-4 bg-red-100 rounded-full animate-pulse -z-10"
                        />
                    )}
                </AnimatePresence>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-[var(--primary)]'}`}>
                    {isRecording ? (
                        <Square className="text-white fill-white" size={32} />
                    ) : (
                        <Mic className="text-white" size={32} />
                    )}
                </div>
            </div>

            <div className="text-center">
                <h3 className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</h3>
                <p className="text-[var(--secondary)] mt-1">
                    {isRecording ? 'מקליט סיכום טיפול...' : audioBlob ? 'ההקלטה מוכנה' : 'לחצי להתחלת הקלטה'}
                </p>
            </div>

            <div className="w-full bg-[var(--primary-container)]/30 rounded-2xl p-4 border border-[var(--primary-container)]/50">
                <h4 className="font-bold text-[var(--primary)] mb-3 text-sm flex items-center gap-2">
                    <Edit3 size={14} />
                    מה לכלול בהקלטה?
                </h4>
                <ul className="text-xs space-y-2 text-[var(--text-secondary)] leading-relaxed list-decimal list-inside">
                    <li><span className="font-semibold">מטרת המפגש:</span> מה ניסינו להשיג היום.</li>
                    <li><span className="font-semibold">תכנים מרכזיים:</span> נושאים שעלו בשיחה או ביצירה.</li>
                    <li><span className="font-semibold">תהליכים רגשיים ויצירתיים:</span> תגובה לחומרים והתהליך.</li>
                    <li><span className="font-semibold">התרשמות מקצועית:</span> תובנות שלך כמטפלת.</li>
                    <li><span className="font-semibold">כיווני המשך:</span> נקודות למחשבה למפגש הבא.</li>
                </ul>
                <p className="mt-3 text-[10px] text-[var(--outline)] italic">
                    * דברי בצורה חופשית ונינוחה, ה-AI כבר יסדר הכל במקומך.
                </p>
            </div>

            <div className="flex gap-4 w-full">
                {!isRecording && !audioBlob && (
                    <>
                        <button
                            onClick={startRecording}
                            className="flex-1 primary-button flex items-center justify-center gap-2"
                        >
                            <Mic size={18} />
                            התחילי הקלטה
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 border border-[var(--primary)] text-[var(--primary)] rounded-full py-3 hover:bg-[var(--primary-container)] transition-colors flex items-center justify-center gap-2"
                        >
                            <UploadCloud size={18} />
                            העלאת קובץ
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="audio/*"
                                className="hidden"
                            />
                        </button>
                    </>
                )}

                {isRecording && (
                    <button
                        onClick={stopRecording}
                        className="flex-1 bg-red-500 text-white rounded-full py-3 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <Square size={18} />
                        עצירה
                    </button>
                )}

                {audioBlob && !isRecording && (
                    <>
                        <button
                            onClick={() => setAudioBlob(null)}
                            className="flex-1 border border-[var(--surface-variant)] text-[var(--secondary)] rounded-full py-3 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            ביטול / מחיקה
                        </button>
                        <button
                            onClick={() => onSave(audioBlob)}
                            className="flex-1 bg-green-500 text-white rounded-full py-3 hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            שמירה וסיכום
                        </button>
                    </>
                )}
            </div>

            <button onClick={onCancel} className="text-sm text-[var(--outline)] hover:text-[var(--primary)] mt-2">
                ביטול
            </button>
        </div>
    );
}
