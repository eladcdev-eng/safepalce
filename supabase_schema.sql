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

-- Patients policy
CREATE POLICY "Therapists can manage own patients" ON patients 
  FOR ALL USING (therapist_id = auth.uid());

-- Sessions policy
CREATE POLICY "Therapists can manage own sessions" ON sessions 
  FOR ALL USING (therapist_id = auth.uid());

-- Transcripts policy
CREATE POLICY "Therapists can manage own transcripts" ON transcripts 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = session_id AND s.therapist_id = auth.uid()
  ));

-- Summaries policy
CREATE POLICY "Therapists can manage own summaries" ON summaries 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = session_id AND s.therapist_id = auth.uid()
  ));
