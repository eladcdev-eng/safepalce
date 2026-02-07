"use client";

import { Search, UserPlus, LogOut, Settings, FileText, Sparkles, Calendar, X, Copy, Check, Filter, LayoutGrid, List, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import AddPatientModal from "@/components/AddPatientModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPatients, createPatient, Patient, getMonthStats } from "@/lib/patients";

export default function Dashboard() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<{ patientId: string, patientName: string, summary: string, brief?: string } | null>(null);
  const [expandedBriefId, setExpandedBriefId] = useState<string | null>(null);
  const [isCopyingBrief, setIsCopyingBrief] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const isFetchingRef = useRef(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [monthStats, setMonthStats] = useState<{ totalSessions: number, uniquePatients: number, workdays: number } | null>(null);
  const [allAffiliations, setAllAffiliations] = useState<string[]>([]);
  
  // New UI States
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAffiliation, setSelectedAffiliation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "last_session" | "session_count">("last_session");

  useEffect(() => {
    setMounted(true);
    // Load view mode preference
    const savedView = localStorage.getItem("dashboard-view-mode");
    if (savedView === "grid" || savedView === "list") setViewMode(savedView);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("dashboard-view-mode", viewMode);
    }
  }, [viewMode, mounted]);

  const loadAppData = async (currentUser: any) => {
    if (!currentUser || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      ensureTherapistRecord(currentUser).catch(err => console.error("Therapist record error:", err));
      const data = await getPatients();
      setPatients(data);
      
      const affiliations = Array.from(new Set(data.map(p => p.affiliation).filter(Boolean) as string[]));
      setAllAffiliations(affiliations);

      try {
        const stats = await getMonthStats();
        setMonthStats(stats);
      } catch (err) {
        console.error("Failed to fetch month stats:", err);
      }
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

  const handleCopyBrief = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopyingBrief(true);
      setTimeout(() => setIsCopyingBrief(false), 2000);
    } catch (err) {
      console.error("Failed to copy brief:", err);
    }
  };

  const handleAutoGenerateBrief = async (patientId: string, summaryText: string) => {
    if (isGeneratingBrief) return;
    setIsGeneratingBrief(true);
    try {
      const { generateBrief } = await import("@/lib/ai");
      const { updateSummaryBrief } = await import("@/lib/patients");
      
      // 1. Get the session ID for the last summary
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('patient_id', patientId)
        .order('session_date', { ascending: false })
        .limit(1)
        .single();

      if (!sessionData) throw new Error("No session found");

      // 2. Generate brief via AI
      const briefRes = await generateBrief(summaryText);
      if (briefRes.error) throw new Error(briefRes.error);

      // 3. Save to DB
      await updateSummaryBrief(sessionData.id, briefRes.text);

      // 4. Update local state
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, last_summary_brief: briefRes.text } : p));
      
    } catch (err) {
      console.error("Failed to auto-generate brief:", err);
    } finally {
      setIsGeneratingBrief(false);
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

  const formatSummary = (text: string) => {
    if (!text) return text;
    // Highlight "Next Steps" and other key clinical markers
    const parts = text.split(/(כיווני המשך:|:כיווני המשך|מטרות:|דגשים:|פעולות לביצוע:)/g);
    return parts.map((part, i) => {
      const isHighlight = ["כיווני המשך:", ":כיווני המשך", "מטרות:", "דגשים:", "פעולות לביצוע:"].includes(part);
      if (isHighlight) {
        return <span key={i} className="bg-[var(--primary-container)] text-[var(--primary)] px-2 py-0.5 rounded-lg font-black inline-block my-1">{part}</span>;
      }
      return part;
    });
  };

  const filteredAndSortedPatients = useMemo(() => {
    let result = patients.filter(p => {
      const matchesSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAffiliation = selectedAffiliation === "all" || p.affiliation === selectedAffiliation;
      return matchesSearch && matchesAffiliation;
    });

    result.sort((a, b) => {
      if (sortBy === "name") {
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      } else if (sortBy === "last_session") {
        const dateA = a.last_session_date ? new Date(a.last_session_date).getTime() : 0;
        const dateB = b.last_session_date ? new Date(b.last_session_date).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "session_count") {
        return (b.session_count || 0) - (a.session_count || 0);
      }
      return 0;
    });

    return result;
  }, [patients, searchQuery, selectedAffiliation, sortBy]);

  if (!mounted || !authInitialized) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/20">
              <Sparkles size={20} />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-lg font-black text-slate-900 leading-none">מיטלוג</h1>
              <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider mt-1">סטודיו לטיפול באומנות</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-slate-900">{user.user_metadata?.full_name || user.email}</span>
                  <span className="text-[10px] text-slate-500">מחוברת למערכת</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="התנתקות"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                התחברי
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl flex items-center justify-center text-[var(--primary)] mb-8">
              <Sparkles size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">ברוכה הבאה למיטלוג</h2>
            <p className="text-slate-500 max-w-md mb-10 font-medium leading-relaxed">
              הכלי החכם שלך לניהול וסיכום מפגשים טיפוליים. התחברי כדי להתחיל לתעד את המפגשים שלך בצורה מקצועית.
            </p>
            <button
              onClick={handleLogin}
              className="flex items-center gap-3 px-8 py-4 bg-[var(--primary)] text-white rounded-2xl font-black text-lg shadow-xl shadow-[var(--primary)]/20 hover:scale-105 transition-all"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
              </svg>
              התחברי עם Google
            </button>
          </div>
        ) : (
          <>
            {/* Stats Section */}
            {monthStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">טיפולים החודש</p>
                    <p className="text-xl font-black text-slate-900">{monthStats.totalSessions}</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">מטופלים פעילים</p>
                    <p className="text-xl font-black text-slate-900">{monthStats.uniquePatients}</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ימי עבודה</p>
                    <p className="text-xl font-black text-slate-900">{monthStats.workdays}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Controls Section */}
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black text-slate-900">המטופלים שלי</h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary)]/20 hover:opacity-90 transition-all"
                >
                  <UserPlus size={20} />
                  מטופל חדש
                </button>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-2 rounded-[28px] border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="חיפוש לפי שם..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-medium focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="relative min-w-[140px]">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                      value={selectedAffiliation}
                      onChange={(e) => setSelectedAffiliation(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-9 pl-4 text-xs font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      <option value="all">כל השיוכים</option>
                      {allAffiliations.map(aff => (
                        <option key={aff} value={aff}>{aff}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative min-w-[140px]">
                    <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-9 pl-4 text-xs font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      <option value="last_session">פעילות אחרונה</option>
                      <option value="name">שם (א-ת)</option>
                      <option value="session_count">מספר מפגשים</option>
                    </select>
                  </div>

                  <div className="flex bg-slate-50 rounded-2xl p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-xl transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-[var(--primary)]" : "text-slate-400"}`}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-xl transition-all ${viewMode === "list" ? "bg-white shadow-sm text-[var(--primary)]" : "text-slate-400"}`}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Patients List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-slate-400">טוען מטופלים...</p>
              </div>
            ) : filteredAndSortedPatients.length === 0 ? (
              <div className="bg-white rounded-[32px] border-2 border-dashed border-slate-200 py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-slate-500 font-bold">לא נמצאו מטופלים התואמים לחיפוש</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredAndSortedPatients.map((patient, idx) => (
                  <div key={patient.id} className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md hover:border-[var(--primary)]/30 transition-all group relative overflow-hidden h-full flex flex-col"
                    >
                      {/* Main Link Area */}
                      <div
                        onClick={() => router.push(`/patients/${patient.id}`)}
                        className="absolute inset-0 z-0 cursor-pointer"
                      >
                        <span className="sr-only">View {patient.first_name}</span>
                      </div>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          onClick={() => router.push(`/patients/${patient.id}`)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <div className="w-12 h-12 bg-slate-50 text-[var(--primary)] rounded-2xl flex items-center justify-center font-black text-lg group-hover:bg-[var(--primary-container)] transition-colors">
                            {patient.first_name[0]}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 group-hover:text-[var(--primary)] transition-colors">
                              {patient.first_name} {patient.last_name}
                            </h3>
                            {patient.affiliation && (
                              <span className="text-[10px] font-black text-[var(--primary)] bg-[var(--primary-container)] px-2 py-0.5 rounded-lg">
                                {patient.affiliation}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          onClick={() => router.push(`/patients/${patient.id}`)}
                          className="text-left cursor-pointer"
                        >
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">מפגשים</div>
                          <div className="text-sm font-black text-slate-900">{patient.session_count || 0}</div>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between relative z-10">
                        <div
                          onClick={() => router.push(`/patients/${patient.id}`)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 cursor-pointer flex-1"
                        >
                          <Calendar size={12} />
                          {patient.last_session_date ? (
                            <span>פעילות: {new Date(patient.last_session_date).toLocaleDateString('he-IL')}</span>
                          ) : (
                            <span>אין מפגשים עדיין</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {patient.last_summary && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const isOpening = expandedBriefId !== patient.id;
                                setExpandedBriefId(isOpening ? patient.id : null);
                                
                                // Auto-generate if missing when opening
                                if (isOpening && !patient.last_summary_brief && patient.last_summary) {
                                  handleAutoGenerateBrief(patient.id, patient.last_summary);
                                }
                              }}
                              className={`h-10 px-4 rounded-full flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                                expandedBriefId === patient.id
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-[var(--primary)] text-white hover:scale-105 active:scale-95'
                              }`}
                            >
                              <Sparkles size={16} />
                              <span className="text-xs font-black">{expandedBriefId === patient.id ? 'סגור' : 'תמצית'}</span>
                            </button>
                          )}
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                            <ArrowUpDown size={16} className="rotate-90" />
                          </div>
                        </div>
                      </div>

                      {/* Inline Expandable Brief */}
                      <AnimatePresence>
                        {expandedBriefId === patient.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 relative">
                              <div className="absolute -top-2 right-6 bg-[var(--primary)] text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">תמצית AI</div>
                              
                              {patient.last_summary_brief ? (
                                <>
                                  <p className="text-sm leading-relaxed text-slate-800 font-bold italic">
                                    "{patient.last_summary_brief}"
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyBrief(patient.last_summary_brief!);
                                    }}
                                    className="mt-4 flex items-center gap-1.5 text-[10px] font-black text-[var(--primary)] hover:opacity-70 transition-opacity"
                                  >
                                    {isCopyingBrief ? <Check size={12} /> : <Copy size={12} />}
                                    {isCopyingBrief ? 'הועתק!' : 'העתק תמצית'}
                                  </button>
                                </>
                              ) : (
                                <div className="py-4 flex flex-col items-center gap-3">
                                  {isGeneratingBrief ? (
                                    <>
                                      <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                                      <p className="text-[10px] font-bold text-[var(--primary)] animate-pulse">מייצר תמצית...</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-[10px] font-bold text-slate-400">אין תמצית מוכנה</p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAutoGenerateBrief(patient.id, patient.last_summary || "");
                                        }}
                                        className="text-[10px] font-black text-[var(--primary)] hover:underline"
                                      >
                                        לחצי ליצירה אוטומטית
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">מטופל</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">שיוך</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">מפגשים</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">פעילות אחרונה</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAndSortedPatients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <Link href={`/patients/${patient.id}`} className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 text-[var(--primary)] rounded-lg flex items-center justify-center font-black text-xs">
                                {patient.first_name[0]}
                              </div>
                              <span className="font-bold text-slate-900 group-hover:text-[var(--primary)] transition-colors">
                                {patient.first_name} {patient.last_name}
                              </span>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            {patient.affiliation ? (
                              <span className="text-[10px] font-black text-[var(--primary)] bg-[var(--primary-container)] px-2 py-0.5 rounded-lg">
                                {patient.affiliation}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{patient.session_count || 0}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {patient.last_session_date ? new Date(patient.last_session_date).toLocaleDateString('he-IL') : 'אין'}
                          </td>
                          <td className="px-6 py-4 text-left">
                            <Link href={`/patients/${patient.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                              <ArrowUpDown size={14} className="rotate-90" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation (Floating) */}
      {user && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-[32px] p-2 shadow-2xl border border-white/10 flex items-center justify-between">
            <Link href="/" className="flex-1 flex flex-col items-center gap-1 py-2 text-[var(--primary)]">
              <LayoutGrid size={20} />
              <span className="text-[10px] font-black">דשבורד</span>
            </Link>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-14 h-14 bg-[var(--primary)] text-white rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary)]/40 -translate-y-4 border-4 border-[#F8FAFC]"
            >
              <UserPlus size={24} />
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-400"
            >
              <LogOut size={20} />
              <span className="text-[10px] font-black">יציאה</span>
            </button>
          </div>
        </div>
      )}

      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPatient}
        existingAffiliations={allAffiliations}
      />
    </div>
  );
}
