-- Set up protection for critical tables to prevent accidental deletion

-- 1. Create audit tables for critical data
CREATE TABLE IF NOT EXISTS registrations_audit (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action TEXT NOT NULL,
    registration_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_audit (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action TEXT NOT NULL,
    attendance_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create triggers to log all changes
CREATE OR REPLACE FUNCTION audit_registrations() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO registrations_audit(action, registration_id, old_data, changed_by)
        VALUES (TG_OP, OLD.id, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO registrations_audit(action, registration_id, old_data, new_data, changed_by)
        VALUES (TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO registrations_audit(action, registration_id, new_data, changed_by)
        VALUES (TG_OP, NEW.id, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_attendance() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO attendance_audit(action, attendance_id, old_data, changed_by)
        VALUES (TG_OP, OLD.id, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO attendance_audit(action, attendance_id, old_data, new_data, changed_by)
        VALUES (TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO attendance_audit(action, attendance_id, new_data, changed_by)
        VALUES (TG_OP, NEW.id, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach triggers
DROP TRIGGER IF EXISTS registrations_audit_trigger ON registrations;
CREATE TRIGGER registrations_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON registrations
FOR EACH ROW EXECUTE FUNCTION audit_registrations();

DROP TRIGGER IF EXISTS attendance_audit_trigger ON attendance;
CREATE TRIGGER attendance_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON attendance
FOR EACH ROW EXECUTE FUNCTION audit_attendance();

-- 4. Create RLS policies to prevent accidental mass deletion
-- (Adjust based on your needs)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Example: Only allow deletion of records created by the user
CREATE POLICY "Users can only delete their own registrations" ON registrations
FOR DELETE USING (auth.uid() = user_id);

-- 5. Create a function to require confirmation for mass deletes
CREATE OR REPLACE FUNCTION safe_delete_registrations(confirm_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF confirm_text != 'DELETE_ALL_REGISTRATIONS_CONFIRMED' THEN
        RAISE EXCEPTION 'Confirmation text incorrect. Mass deletion prevented.';
    END IF;
    -- Only after confirmation, allow deletion
    DELETE FROM registrations;
    RETURN 'All registrations deleted';
END;
$$ LANGUAGE plpgsql;

-- 6. Regular backup function (run this daily via cron)
CREATE OR REPLACE FUNCTION backup_critical_tables()
RETURNS void AS $$
DECLARE
    backup_date TEXT := to_char(NOW(), 'YYYY_MM_DD');
BEGIN
    -- Create daily backup tables
    EXECUTE format('CREATE TABLE IF NOT EXISTS registrations_backup_%s AS SELECT * FROM registrations', backup_date);
    EXECUTE format('CREATE TABLE IF NOT EXISTS attendance_backup_%s AS SELECT * FROM attendance', backup_date);
END;
$$ LANGUAGE plpgsql;