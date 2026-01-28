import { supabase } from "@/lib/supabase";

export interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    birth_date?: string;
    notes?: string;
    created_at: string;
}

export async function getPatients() {
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('last_name', { ascending: true });

    if (error) throw error;
    return data as Patient[];
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
