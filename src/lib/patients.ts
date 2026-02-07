import { supabase } from "@/lib/supabase";

export interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    birth_date?: string;
    notes?: string;
    affiliation?: string;
    created_at: string;
    session_count?: number;
    last_session_date?: string;
    last_summary?: string;
    last_summary_brief?: string;
}

export async function getPatients() {
    const { data, error } = await supabase
        .from('patients')
        .select(`
            *,
            sessions (
                id,
                session_date,
                summaries (
                    summary_text,
                    summary_brief
                )
            )
        `)
        .order('last_name', { ascending: true });

    if (error) throw error;

    // Transform data to include session count and last summary
    const transformedData = data.map((p: any) => {
        const sortedSessions = p.sessions?.sort((a: any, b: any) =>
            new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        ) || [];

        const lastSession = sortedSessions[0];
        const lastSummary = lastSession?.summaries?.[0]?.summary_text;
        const lastSummaryBrief = lastSession?.summaries?.[0]?.summary_brief;

        return {
            ...p,
            session_count: sortedSessions.length,
            last_session_date: lastSession?.session_date,
            last_summary: lastSummary,
            last_summary_brief: lastSummaryBrief
        };
    });

    return transformedData as Patient[];
}

export async function createPatient(patient: Omit<Patient, 'id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("createPatient: No active user session found");
        throw new Error("חייבת להיות מחוברת כדי להוסיף מטופל");
    }

    const insertData = {
        ...patient,
        therapist_id: user.id
    };

    console.log("createPatient: Attempting insert with:", insertData);

    const { data, error } = await supabase
        .from('patients')
        .insert([insertData])
        .select();

    if (error) {
        console.error("Supabase Error Details:", JSON.stringify(error, null, 2));
        throw error;
    }
    return data[0] as Patient;
}

export async function updatePatient(id: string, updates: Partial<Omit<Patient, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0] as Patient;
}

export async function deletePatient(id: string) {
    const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function updateSummary(sessionId: string, summaryText: string) {
    // Attempt to update the existing summary for this session
    const { data, error } = await supabase
        .from('summaries')
        .update({ summary_text: summaryText })
        .eq('session_id', sessionId)
        .select();

    if (error) throw error;

    // If no summary existed (unlikely but possible), insert one
    if (data.length === 0) {
        const { data: newData, error: insertError } = await supabase
            .from('summaries')
            .insert([{ session_id: sessionId, summary_text: summaryText }])
            .select();
        if (insertError) throw insertError;
        return newData[0];
    }

    return data[0];
}

export async function updateSummaryBrief(sessionId: string, summaryBrief: string) {
    const { data, error } = await supabase
        .from('summaries')
        .update({ summary_brief: summaryBrief })
        .eq('session_id', sessionId)
        .select();

    if (error) throw error;
    return data[0];
}

export async function deleteSession(id: string) {
    const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function updateSessionDate(id: string, newDate: string) {
    const { data, error } = await supabase
        .from('sessions')
        .update({ session_date: new Date(newDate).toISOString() })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

export async function mergeSessions(masterSessionId: string, subSessionIds: string[]) {
    const { error } = await supabase
        .from('sessions')
        .update({ parent_session_id: masterSessionId })
        .in('id', subSessionIds);

    if (error) throw error;
    return true;
}

export async function getMonthStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('session_date, patient_id, parent_session_id')
        .gte('session_date', startOfMonth);

    if (error) throw error;

    // Only count master sessions (those without a parent)
    const masterSessions = sessions.filter(s => !s.parent_session_id);

    const totalSessions = masterSessions.length;
    const uniquePatients = new Set(masterSessions.map(s => s.patient_id)).size;
    const workdays = new Set(masterSessions.map(s => new Date(s.session_date).toLocaleDateString())).size;

    return {
        totalSessions,
        uniquePatients,
        workdays
    };
}

export async function createGroupedSession(patientId: string, therapistId: string, sessionDate: string, recordings: { transcript: string }[], finalSummary: string, summaryBrief: string) {
    // 1. Create the master session
    const { data: masterSession, error: masterError } = await supabase
        .from('sessions')
        .insert([{
            patient_id: patientId,
            therapist_id: therapistId,
            session_date: new Date(sessionDate).toISOString()
        }])
        .select()
        .single();

    if (masterError) throw masterError;

    // 2. Create sub-sessions for each recording and their transcripts
    for (const rec of recordings) {
        const { data: subSession, error: subError } = await supabase
            .from('sessions')
            .insert([{
                patient_id: patientId,
                therapist_id: therapistId,
                parent_session_id: masterSession.id,
                session_date: new Date(sessionDate).toISOString()
            }])
            .select()
            .single();

        if (subError) throw subError;

        await supabase.from('transcripts').insert([{
            session_id: subSession.id,
            raw_text: rec.transcript
        }]);
    }

    // 3. Save the final summary to the master session
    const { error: summaryError } = await supabase
        .from('summaries')
        .insert([{
            session_id: masterSession.id,
            summary_text: finalSummary,
            summary_brief: summaryBrief
        }]);

    if (summaryError) throw summaryError;

    return masterSession;
}
