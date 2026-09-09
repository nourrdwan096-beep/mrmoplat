-- =========================================================================
-- MR. MOHAMED RADWAN EDUCATION PLATFORM
-- ULTRA-SECURE PRODUCTION SUPABASE (POSTGRESQL) SCHEMA
-- Built with Developer & Designer: NOUR M. EL-SAIED 💚 💚
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAIN TYPES
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('super_admin', 'teacher', 'assistant', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE student_status_type AS ENUM ('pending_review', 'active', 'rejected', 'banned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE education_stage_type AS ENUM ('middle', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE education_system_type AS ENUM ('general', 'azhar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lesson_item_type AS ENUM ('video', 'homework', 'exam', 'concept_sheet', 'summary_pdf');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_type_enum AS ENUM ('technical', 'academic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status_enum AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES / USERS TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- linked to Supabase auth if used
    role user_role_type NOT NULL DEFAULT 'student',
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    parent_phone VARCHAR(20),
    phone_carrier VARCHAR(30), -- 'Vodafone', 'Orange', 'Etisalat', 'WE'
    password_hash TEXT NOT NULL,
    encrypted_password_vault TEXT, -- Encrypted for teacher master key viewing (sse-000-#######-****&mr+pp)
    avatar_url TEXT,
    stage education_stage_type DEFAULT 'high',
    education_type education_system_type DEFAULT 'general',
    grade SMALLINT DEFAULT 1 CHECK (grade IN (1, 2, 3)),
    status student_status_type NOT NULL DEFAULT 'pending_review',
    whatsapp_otp VARCHAR(6),
    otp_verified BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT,
    ban_reason TEXT,
    primary_device_fingerprint TEXT,
    is_frozen BOOLEAN DEFAULT FALSE,
    wallet_balance NUMERIC(10, 2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BANNED DEVICES TABLE (Strict Hardware/Fingerprint Lockdown)
CREATE TABLE IF NOT EXISTS public.banned_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    reason TEXT NOT NULL,
    banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REGISTERED STUDENT DEVICES (Max 2 Devices per Student / Course)
CREATE TABLE IF NOT EXISTS public.student_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name VARCHAR(100),
    browser_info TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, device_fingerprint)
);

-- 6. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE,
    description TEXT,
    cover_image_url TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT FALSE,
    stage education_stage_type NOT NULL,
    grade SMALLINT NOT NULL CHECK (grade IN (1, 2, 3)),
    education_type education_system_type NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    publish_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. COURSE UNITS TABLE
CREATE TABLE IF NOT EXISTS public.course_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    unit_number SMALLINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (course_id, unit_number)
);

-- 8. UNIT ITEMS / LESSONS TABLE (Videos, Homework, Exams, Concepts, Summaries)
CREATE TABLE IF NOT EXISTS public.unit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    item_type lesson_item_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 1,
    is_prerequisite_required BOOLEAN DEFAULT TRUE, -- Must pass previous item
    passing_score_percentage SMALLINT DEFAULT 60 CHECK (passing_score_percentage BETWEEN 0 AND 100),
    video_source_type VARCHAR(30) DEFAULT 'internal_secured', -- 'internal_secured' | 'direct_youtube'
    obfuscated_video_id TEXT, -- Obfuscated/Encrypted YouTube payload
    direct_video_url TEXT,
    pdf_attachment_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 100,
    max_exam_attempts SMALLINT DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. QUIZ / EXAM / HOMEWORK QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.unit_items(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_image_url TEXT,
    question_type VARCHAR(30) DEFAULT 'mcq', -- 'mcq', 'true_false', 'written'
    options JSONB NOT NULL, -- Array of strings/objects: [{"id": "a", "text": "..."}, ...]
    correct_answer_id VARCHAR(50) NOT NULL,
    explanation TEXT,
    points NUMERIC(5, 2) DEFAULT 1.00,
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. COURSE ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL, -- 'fawry', 'wallet', 'activation_code', 'free', 'admin_grant'
    amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE (student_id, course_id)
);

-- 11. ACTIVATION CODES TABLE (Generated by Teacher)
CREATE TABLE IF NOT EXISTS public.course_activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    batch_name VARCHAR(100),
    is_used BOOLEAN DEFAULT FALSE,
    used_by_student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. STUDENT ITEM PROGRESSION (Strict Prerequisite Tracking)
CREATE TABLE IF NOT EXISTS public.student_item_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.unit_items(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'locked', -- 'locked', 'available', 'in_progress', 'completed', 'failed'
    attempts_count SMALLINT DEFAULT 0,
    highest_score NUMERIC(5, 2) DEFAULT 0.00,
    last_score NUMERIC(5, 2) DEFAULT 0.00,
    is_passed BOOLEAN DEFAULT FALSE,
    student_answers JSONB, -- Record of student choices
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, item_id)
);

-- 13. STUDENT WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL, -- 'fawry_recharge', 'course_purchase', 'refund', 'bonus'
    fawry_reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. SUPPORT TICKETS (Technical & Academic Support with Smart Dispatch)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number BIGSERIAL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    ticket_type ticket_type_enum NOT NULL,
    subject VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status_enum DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'urgent'
    assigned_to_assistant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_role user_role_type NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TEACHER MESSAGES & BROADCASTS (With Student WhatsApp Reply)
CREATE TABLE IF NOT EXISTS public.student_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means broadcast
    is_broadcast BOOLEAN DEFAULT FALSE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    whatsapp_reply_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. ANNOUNCEMENTS (Home Page & Dashboard Banner)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    target_stage education_stage_type,
    target_grade SMALLINT,
    is_published BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. STUDENT SKETCH NOTES (Interactive Notebook with Colors, Covers & Pins)
CREATE TABLE IF NOT EXISTS public.student_sketch_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    color_theme VARCHAR(30) DEFAULT 'amber', -- 'amber', 'emerald', 'sky', 'rose', 'indigo', 'violet'
    icon_name VARCHAR(50) DEFAULT 'bookmark',
    is_pinned BOOLEAN DEFAULT FALSE,
    page_number INTEGER DEFAULT 1,
    cover_title VARCHAR(100) DEFAULT 'My English Notebook',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. STUDENT STUDY PLANNER & SCHEDULE (Synced with Cairo Timezone)
CREATE TABLE IF NOT EXISTS public.student_study_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    scheduled_time TIME NOT NULL,
    subject_task VARCHAR(200) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    is_completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. TEACHER APPOINTMENTS & PRIVATE IDEAS / NOTES
CREATE TABLE IF NOT EXISTS public.teacher_schedules_and_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    item_type VARCHAR(30) DEFAULT 'schedule', -- 'schedule', 'private_note', 'idea', 'task'
    scheduled_datetime TIMESTAMPTZ,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'urgent'
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ASSISTANT GRANULAR PERMISSIONS
CREATE TABLE IF NOT EXISTS public.assistant_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_manage_students BOOLEAN DEFAULT TRUE,
    can_approve_registrations BOOLEAN DEFAULT TRUE,
    can_view_student_passwords BOOLEAN DEFAULT FALSE,
    can_manage_all_courses BOOLEAN DEFAULT FALSE,
    assigned_course_ids UUID[] DEFAULT '{}',
    can_handle_academic_support BOOLEAN DEFAULT TRUE,
    can_handle_technical_support BOOLEAN DEFAULT TRUE,
    can_review_homework BOOLEAN DEFAULT TRUE,
    can_publish_announcements BOOLEAN DEFAULT FALSE,
    is_frozen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. AUDIT LOGS (Real-time tracking of assistant and admin actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(150),
    actor_role user_role_type,
    action_type VARCHAR(100) NOT NULL, -- 'APPROVE_STUDENT', 'BAN_DEVICE', 'DELETE_LESSON', etc.
    target_entity VARCHAR(100) NOT NULL,
    target_id UUID,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 22. PERFORMANCE INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_banned_devices_fingerprint ON public.banned_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_student_devices_student ON public.student_devices(student_id);
CREATE INDEX IF NOT EXISTS idx_courses_stage_grade ON public.courses(stage, grade, education_type);
CREATE INDEX IF NOT EXISTS idx_unit_items_unit ON public.unit_items(unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON public.course_enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_item ON public.student_item_progress(student_id, item_id);
CREATE INDEX IF NOT EXISTS idx_tickets_student ON public.support_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);

-- =========================================================================
-- 23. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_item_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sketch_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_study_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_schedules_and_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 24. PUBLIC ACCESS POLICIES (Read published courses & announcements)
CREATE POLICY "Public can view published courses" ON public.courses
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Public can view published announcements" ON public.announcements
    FOR SELECT USING (is_published = TRUE);

-- Helper trigger for automatic timestamp update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER update_courses_modtime
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
