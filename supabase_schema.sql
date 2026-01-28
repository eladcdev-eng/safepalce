-- Create therapists table
CREATE TABLE therapists (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create summaries table
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Therapists policies
CREATE POLICY "Therapists can view own profile" ON therapists FOR SELECT USING (id = auth.uid());
CREATE POLICY "Therapists can insert own profile" ON therapists FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Therapists can update own profile" ON therapists FOR UPDATE USING (id = auth.uid());

-- Patients policy: Allow all authenticated users to manage all patients
CREATE POLICY "Authenticated users can manage all patients" ON patients 
  FOR ALL USING (auth.role() = 'authenticated');

-- Sessions policy: Allow all authenticated users to manage all sessions
CREATE POLICY "Authenticated users can manage all sessions" ON sessions 
  FOR ALL USING (auth.role() = 'authenticated');

-- Transcripts policy: Allow all authenticated users to manage all transcripts
CREATE POLICY "Authenticated users can manage all transcripts" ON transcripts 
  FOR ALL USING (auth.role() = 'authenticated');

-- Summaries policy: Allow all authenticated users to manage all summaries
CREATE POLICY "Authenticated users can manage all summaries" ON summaries 
  FOR ALL USING (auth.role() = 'authenticated');
