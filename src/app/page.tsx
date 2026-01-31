"use client";

import { Search, UserPlus, LogOut, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    // Define a robust session check function
    const verifySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await ensureTherapistRecord(session.user);
        await fetchPatients();
      } else {
        // Only set loading to false if we are sure there is no session
        setIsLoading(false);
      }
    };

    // 1. Initial check on mount
    verifySession();

    // 2. Listen for auth state changes (essential for OAuth redirects and token refreshes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session?.user?.email);

      if (session?.user) {
        setUser(session.user);
        await ensureTherapistRecord(session.user);
        await fetchPatients();
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        setUser(null);
        setPatients([]);
        setIsLoading(false);
      }
    });

    // 3. Proactive recovery - check session when user returns to the tab
    const handleActivity = () => {
      if (document.visibilityState === 'visible') {
        console.log("App returned to foreground - verifying session...");
        verifySession();
      }
    };

    window.addEventListener('focus', handleActivity);
    window.addEventListener('visibilitychange', handleActivity);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('visibilitychange', handleActivity);
    };
  }, []);

  const ensureTherapistRecord = async (user: any) => {
    try {
      const { data: therapist, error: tError } = await supabase
        .from('therapists')
        .select('id')
        .eq('id', user.id)
        .single();

      if (tError && tError.code !== 'PGRST116') {
        console.error("Error checking therapist:", tError);
      }

      if (!therapist) {
        console.log("Creating therapist record for Google user...");
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'מיטל';
        await supabase.from('therapists').insert([
          { id: user.id, email: user.email, name: fullName }
        ]);
      }
    } catch (err) {
      console.error("Failed to ensure therapist record:", err);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
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
        {!user && !isLoading ? (
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
    </div>
  );
}
