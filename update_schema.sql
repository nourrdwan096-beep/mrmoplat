ALTER TABLE public.quiz_questions 
  ADD COLUMN IF NOT EXISTS grading_type VARCHAR(20) DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS ideal_answer TEXT,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS enforce_unit_progression BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enforce_item_progression BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS has_discount BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 3;

CREATE TABLE IF NOT EXISTS public.course_device_bindings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  hardware_core_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type VARCHAR(30) DEFAULT 'desktop',
  os VARCHAR(50),
  browsers_seen JSONB DEFAULT '[]'::jsonb,
  is_primary BOOLEAN DEFAULT FALSE,
  activated_via VARCHAR(50),
  bound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id, hardware_core_id)
);

