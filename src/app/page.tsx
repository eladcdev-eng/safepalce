"use client";

import { Search, UserPlus, LogOut, Settings, FileText, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import AddPatientModal from "@/components/AddPatientModal";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getPatients, createPatient, Patient } from "@/lib/patients";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const isFetchingRef = useRef(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAppData = async (currentUser: any) => {
    if (!currentUser || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      ensureTherapistRecord(currentUser).catch(err => console.error("Therapist record error:", err));
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Failed to load app data:", err);
      if ((err as any).code === '42501' || (err as any).status === 401) {
        setUser(null);
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && patients.length === 0 && !isFetchingRef.current) {
      loadAppData(user);
    }
  }, [user, patients.length]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            if (window.location.search.includes('code=') || window.location.hash.includes('access_token')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
          setAuthInitialized(true);
        }
      } catch (err) {
        console.error("Dashboard: Auth init error:", err);
        if (isMounted) {
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setPatients([]);
      }
      setAuthInitialized(true);
      if (event === 'SIGNED_OUT') setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const ensureTherapistRecord = async (user: any) => {
    if (!user) return;
    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!therapist && (!tError || tError.code === 'PGRST116')) {
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'מיטל';
      await supabase.from('therapists').insert([
        { id: user.id, email: user.email, name: fullName }
      ]);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('meytalog-auth-token');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: any) {
      window.location.reload();
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' }
      },
    });
    if (error) alert("שגיאה בהתחברות: " + error.message);
  };

  const handleAddPatient = async (patientData: any) => {
    try {
      await createPatient(patientData);
      const data = await getPatients();
      setPatients(data);
    } catch (err: any) {
      alert(`שגיאה ביצירת מטופל: ${err.message || "בדקי חיבור לרשת"}`);
    }
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10 glass-card p-4 md:p-5 sticky top-4 z-40">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/20">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              מיטלוג
              <span className="text-xs md:text-sm font-medium text-[var(--primary)] bg-[var(--primary-container)] px-2 py-0.5 rounded-full animate-pulse">
                מוקדש לך באהבה ❤️
              </span>
            </h1>
            <p className="text-xs font-semibold text-[var(--primary)] opacity-80">סטודיו לטיפול באומנות</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/invoice-proforma"
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary-container)] text-[var(--primary)] rounded-2xl hover:bg-[var(--primary)] hover:text-white transition-all font-bold text-sm md:text-base shadow-sm"
          >
            <FileText size={18} />
            <span className="hidden sm:inline">חשבונית</span>
          </Link>
          
          {user && (
            <button
              onClick={handleLogout}
              className="p-2.5 hover:bg-red-50 rounded-2xl transition-all text-red-500 border border-transparent hover:border-red-100"
              title="התנתקות"
            >
              <LogOut size={20} />
            </button>
          )}
          
          <button className="p-2.5 hover:bg-[var(--surface-variant)] rounded-2xl transition-all text-[var(--outline)]">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {!authInitialized ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-[var(--text-secondary)] font-bold text-lg animate-pulse">יוצרים מרחב טיפולי...</p>
          </div>
        ) : !user ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 glass-card text-center max-w-2xl mx-auto"
          >
            <div className="w-20 h-20 bg-[var(--primary-container)] rounded-3xl flex items-center justify-center text-[var(--primary)] mb-8">
              <Sparkles size={40} />
            </div>
            <h2 className="text-3xl font-black mb-4 text-[var(--text-primary)]">ברוכה הבאה למיטלוג</h2>
            <p className="text-lg text-[var(--text-secondary)] mb-10 leading-relaxed">
              המרחב הדיגיטלי שלך לניהול ותיעוד טיפולים באומנות. <br/>
              <span className="text-[var(--primary)] font-bold italic">מוקדש לך באהבה ❤️</span>
            </p>
            <button
              onClick={handleLogin}
              className="primary-button flex items-center gap-3 text-lg px-10 py-5"
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity="0.8" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor" opacity="0.8" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity="0.8" />
              </svg>
              התחברי עם Google
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
              <div>
                <h2 className="text-3xl font-black text-[var(--text-primary)] mb-1">המטופלים שלי</h2>
                <p className="text-[var(--text-secondary)] font-medium">יש לך {filteredPatients.length} מטופלים רשומים</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="primary-button w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <UserPlus size={20} />
                מטופל חדש
              </button>
            </div>

            <div className="relative mb-12 group">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--outline)] group-focus-within:text-[var(--primary)] transition-colors" size={20} />
              <input
                type="text"
                placeholder="חיפוש מטופל לפי שם..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface)] text-[var(--text-primary)] border-2 border-transparent rounded-3xl py-5 pr-14 pl-6 focus:outline-none focus:border-[var(--primary)]/20 shadow-xl shadow-black/[0.02] transition-all text-lg font-medium"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredPatients.map((patient, idx) => (
                  <Link href={`/patients/${patient.id}`} key={patient.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(139, 92, 246, 0.1)" }}
                      className="glass-card p-6 md:p-8 cursor-pointer group h-full flex flex-col relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[var(--primary)] to-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-[var(--primary-container)] text-[var(--primary)] rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                          {patient.first_name[0]}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                            {patient.first_name} {patient.last_name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--secondary)] mt-1">
                            <div className="w-2 h-2 rounded-full bg-[var(--secondary)]" />
                            בטיפול
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-[var(--text-secondary)] leading-relaxed line-clamp-3 flex-1 font-medium">
                        {patient.notes || "אין הערות קליניות רשומות עדיין..."}
                      </p>

                      <div className="mt-8 pt-6 border-t border-[var(--surface-variant)] flex justify-end items-center">
                        <span className="text-[var(--primary)] font-black flex items-center gap-2 group-hover:gap-3 transition-all">
                          לתיק המטופל
                          <span className="text-2xl">←</span>
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
                
                {filteredPatients.length === 0 && !isLoading && (
                  <div className="col-span-full py-24 text-center glass-card border-dashed border-2">
                    <div className="w-16 h-16 bg-[var(--surface-variant)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--outline)]">
                      <Search size={32} />
                    </div>
                    <p className="text-xl font-bold text-[var(--text-secondary)]">לא מצאנו מטופל כזה...</p>
                    <p className="text-[var(--outline)] mt-2">אולי כדאי לנסות שם אחר?</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPatient}
      />
    </div>
  );
}
