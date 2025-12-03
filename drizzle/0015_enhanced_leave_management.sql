-- Migration: Enhanced Leave Management System
-- Add missing fields to leave_requests table and create new tables

-- Update leave_requests table with new fields
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "approver_id" uuid REFERENCES "users"(id);
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "emergency_contact" varchar(100);
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "handover_notes" text;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "document_url" text;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "is_manual_entry" boolean DEFAULT false;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "manual_entry_by" uuid REFERENCES "users"(id);

-- Create leave_policies table
CREATE TABLE IF NOT EXISTS "leave_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "leave_type" varchar(50) NOT NULL UNIQUE,
  "display_name" varchar(100) NOT NULL,
  "annual_quota" integer NOT NULL DEFAULT 0,
  "max_consecutive_days" integer,
  "requires_document" boolean DEFAULT false,
  "requires_approval" boolean DEFAULT true,
  "carry_forward_enabled" boolean DEFAULT false,
  "max_carry_forward" integer DEFAULT 0,
  "min_notice_days" integer DEFAULT 0,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create leave_balances table
CREATE TABLE IF NOT EXISTS "leave_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "employee_id" uuid NOT NULL REFERENCES "employees"(id) ON DELETE CASCADE,
  "leave_type" varchar(50) NOT NULL,
  "year" integer NOT NULL,
  "total_quota" integer NOT NULL DEFAULT 0,
  "used_quota" integer NOT NULL DEFAULT 0,
  "pending_quota" integer NOT NULL DEFAULT 0,
  "available_quota" integer NOT NULL DEFAULT 0,
  "carried_forward" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("employee_id", "leave_type", "year")
);

-- Insert default leave policies
INSERT INTO "leave_policies" ("leave_type", "display_name", "annual_quota", "max_consecutive_days", "requires_document", "carry_forward_enabled", "max_carry_forward", "description")
VALUES 
  ('sick', 'Sick Leave', 12, NULL, true, false, 0, 'For health-related absences'),
  ('casual', 'Casual Leave', 8, 5, false, true, 3, 'For personal matters'),
  ('earned', 'Earned Leave', 21, NULL, false, true, 10, 'Accumulated annual leave'),
  ('maternity', 'Maternity Leave', 180, NULL, true, false, 0, 'Maternity leave for female employees'),
  ('paternity', 'Paternity Leave', 15, NULL, false, false, 0, 'Paternity leave for male employees')
ON CONFLICT ("leave_type") DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_leave_requests_approver" ON "leave_requests"("approver_id");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_status" ON "leave_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_employee_status" ON "leave_requests"("employee_id", "status");
CREATE INDEX IF NOT EXISTS "idx_leave_balances_employee" ON "leave_balances"("employee_id");
CREATE INDEX IF NOT EXISTS "idx_leave_balances_employee_year" ON "leave_balances"("employee_id", "year");

-- Create function to automatically update leave balances
CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update balance when leave status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE leave_balances
    SET 
      used_quota = used_quota + NEW.days,
      available_quota = total_quota + carried_forward - (used_quota + NEW.days),
      updated_at = now()
    WHERE employee_id = NEW.employee_id 
      AND leave_type = NEW.leave_type 
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;

  -- Restore balance when approved leave is rejected or deleted
  IF OLD.status = 'approved' AND NEW.status IN ('rejected', 'pending') THEN
    UPDATE leave_balances
    SET 
      used_quota = GREATEST(0, used_quota - OLD.days),
      available_quota = total_quota + carried_forward - GREATEST(0, used_quota - OLD.days),
      updated_at = now()
    WHERE employee_id = OLD.employee_id 
      AND leave_type = OLD.leave_type 
      AND year = EXTRACT(YEAR FROM OLD.start_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic balance updates
DROP TRIGGER IF EXISTS trg_update_leave_balance ON leave_requests;
CREATE TRIGGER trg_update_leave_balance
AFTER UPDATE OF status ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_balance();

-- Comments for documentation
COMMENT ON TABLE leave_policies IS 'Defines leave types and their rules/quotas';
COMMENT ON TABLE leave_balances IS 'Tracks leave balance for each employee per year';
COMMENT ON COLUMN leave_requests.approver_id IS 'User who will approve/reject this leave request';
COMMENT ON COLUMN leave_requests.is_manual_entry IS 'True if admin created this entry manually';
