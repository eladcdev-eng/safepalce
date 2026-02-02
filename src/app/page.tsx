"use client";

import { Search, UserPlus, LogOut, Settings, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
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
  const userRef = useRef<any>(null); // Ref to track user without effect dependencies
  const [mounted, setMounted] = useState(false);

  const isFetchingRef = useRef(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Sync ref with state effectively and track mount
  useEffect(() => {
    userRef.current = user;
    setMounted(true);
  }, [user]);

  // Data fetcher - always ensures therapist record exists then gets patients
  const loadAppData = async (currentUser: any) => {
    if (!currentUser || isFetchingRef.current) return;

    console.log("Starting data load for:", currentUser.email);
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      // Run therapist record check in background or await it
      // We don't want a failure here to block patient list
      ensureTherapistRecord(currentUser).catch(err => console.error("Therapist record error:", err));

      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Failed to load app data:", err);
      // If it's an auth error, clear user
      if ((err as any).code === '42501' || (err as any).status === 401) {
        setUser(null);
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  // Trigger data load whenever user is found
  useEffect(() => {
    if (user && patients.length === 0 && !isFetchingRef.current) {
      loadAppData(user);
    }
  }, [user, patients.length]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Dashboard: Checking initial session...");
        const { data: { session } } = await supabase.auth.getSession();

        if (isMounted) {
          if (session?.user) {
            console.log("Dashboard: Initial session found:", session.user.email);
            setUser(session.user);
          } else {
            console.log("Dashboard: No initial session");
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
      console.log("Dashboard Auth Event:", event, session?.user?.email);
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
  }, []); // Run once on mount

  const ensureTherapistRecord = async (user: any) => {
    if (!user) return;
    const { data: therapist, error: tError } = await supabase
      .from('therapists')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!therapist && (!tError || tError.code === 'PGRST116')) {
      console.log("Creating therapist record...");
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'מיטל';
      await supabase.from('therapists').insert([
        { id: user.id, email: user.email, name: fullName }
      ]);
    }
  };

  const fetchPatients = async () => {
    // This is now integrated into loadAppData for better flow
    if (user) await loadAppData(user);
  };

  const handleLogout = async () => {
    try {
      console.log("Logging out...");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      localStorage.removeItem('meytalog-auth-token'); // Force clear
      window.location.href = '/'; // Hard redirect to home
    } catch (err: any) {
      console.error("Logout error:", err);
      // Fallback
      localStorage.removeItem('meytalog-auth-token');
      window.location.reload();
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        }
      },
    });

    if (error) alert("שגיאה בהתחברות עם גוגל: " + error.message);
  };

  const handleAddPatient = async (patientData: any) => {
    try {
      console.log("Adding patient:", patientData);
      const newPatient = await createPatient(patientData);
      console.log("Patient created successfully:", newPatient);
      fetchPatients();
    } catch (err: any) {
      console.error("Error creating patient:", err);
      if (err.message) console.error("Error Message Detail:", err.message);
      if (err.details) console.error("Supabase Error Details:", err.details);

      alert(`שגיאה ביצירת מטופל: ${err.message || "בדקי חיבור לרשת"}`);
    }
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-6 pb-20">
      <header className="flex justify-between items-center mb-6 bg-[var(--glass)] backdrop-blur-md p-3 md:p-4 rounded-2xl border border-[var(--surface-variant)] shadow-sm sticky top-4 z-40">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">
            M
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg md:text-xl font-bold truncate text-[var(--text-primary)]">MeytaLog</h1>
            <p className="text-[10px] md:text-xs text-[var(--secondary)] truncate max-w-[120px] md:max-w-none font-medium">שלום, {user?.email || 'אורחת'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/invoice-proforma"
            className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-2 bg-[var(--surface-variant)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--primary)] hover:text-white transition-all font-medium text-xs md:text-base border border-transparent shadow-sm"
          >
            <FileText size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="xs:inline">חשבונית</span>
          </Link>
          <button className="p-2 md:p-2.5 hover:bg-[var(--surface-variant)] rounded-xl transition-all text-[var(--outline)]">
            <Settings size={18} />
          </button>
          {user && (
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 md:px-4 md:py-2 hover:bg-red-500/10 text-red-600 rounded-xl transition-all font-medium flex items-center gap-1.5 md:gap-2 text-sm md:text-base border border-transparent hover:border-red-500/20"
            >
              <LogOut size={16} />
              <span className="hidden xs:inline">התנתקות</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {!authInitialized || (isLoading && !user) ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[var(--text-secondary)] font-medium">מתחבר למערכת...</p>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-20 px-4 bg-[var(--surface)] rounded-3xl border border-dashed border-[var(--surface-variant)] shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center text-[var(--text-primary)]">נדרשת התחברות</h2>
            <p className="text-sm md:text-base text-[var(--text-secondary)] mb-8 max-w-sm text-center">
              על מנת לשמור את נתוני המטופלים בבטחה, יש להתחבר למערכת.
            </p>
            <button
              onClick={handleLogin}
              className="flex items-center gap-3 px-6 py-3 bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-xl hover:bg-[var(--surface-variant)] transition-all font-semibold shadow-sm text-sm md:text-base active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              התחברי עם Google
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">מטופלים ({filteredPatients.length})</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="primary-button w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 shadow-lg shadow-[var(--primary)]/20"
              >
                <UserPlus size={18} />
                מטופל חדש
              </button>
            </div>

            <div className="relative mb-8">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
              <input
                type="text"
                placeholder="חיפוש מטופל ברשימה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-2xl py-3.5 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm transition-all text-sm md:text-base"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredPatients.map((patient) => (
                  <Link href={`/patients/${patient.id}`} key={patient.id}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-5 md:p-6 cursor-pointer border border-transparent hover:border-[var(--primary)]/30 transition-all group h-full flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-[var(--primary-container)] text-[var(--primary)] rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner">
                          {patient.first_name[0]}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold group-hover:text-[var(--primary)] text-[var(--text-primary)] transition-colors">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2 flex-1">
                        {patient.notes || "אין הערות קליניות רשומות"}
                      </p>

                      <div className="mt-6 pt-4 border-t border-[var(--surface-variant)] flex justify-between items-center transition-opacity flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--secondary)]">
                          <div className="w-2 h-2 rounded-full bg-[var(--secondary)] animate-pulse" />
                          פעיל
                        </div>
                        <span className="text-[var(--primary)] text-sm font-bold flex items-center gap-1">
                          צפייה
                          <span className="text-lg">←</span>
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
                {filteredPatients.length === 0 && !isLoading && (
                  <div className="col-span-full py-16 text-center text-[var(--text-secondary)] border-2 border-dashed border-[var(--surface-variant)] rounded-3xl bg-[var(--surface)]/50">
                    לא נמצאו מטופלים העונים לחיפוש
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

      {/* Subtle Debug Panel for finding persistence issues */}
      <div className="fixed bottom-4 left-4 z-50 opacity-10 hover:opacity-100 transition-opacity flex flex-col gap-1 items-start">
        <p className="text-[10px] bg-black/50 text-white px-2 py-1 rounded">
          Auth: {authInitialized ? 'Ready' : 'Initing'} | User: {user ? 'Yes' : 'No'} | Patients: {patients.length} | Loading: {isLoading ? 'Yes' : 'No'}
        </p>
        {mounted && (
          <p className="text-[10px] bg-black/50 text-white px-2 py-1 rounded">
            Storage: {localStorage.getItem('meytalog-auth-token') ? 'Found' : 'Missing'} |
            URL: {window.location.hash.includes('access_token') ? 'Has Token' : 'No Hash'}
          </p>
        )}
        <button
          onClick={() => {
            localStorage.removeItem('meytalog-auth-token');
            window.location.reload();
          }}
          className="text-[8px] bg-red-500/20 text-red-600 px-2 py-1 rounded border border-red-500/30"
        >
          Reset Auth Status
        </button>
      </div>
    </div>
  );
}
