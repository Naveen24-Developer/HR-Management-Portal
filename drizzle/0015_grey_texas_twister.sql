CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"total_quota" integer DEFAULT 0 NOT NULL,
	"used_quota" integer DEFAULT 0 NOT NULL,
	"pending_quota" integer DEFAULT 0 NOT NULL,
	"available_quota" integer DEFAULT 0 NOT NULL,
	"carried_forward" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"annual_quota" integer DEFAULT 0 NOT NULL,
	"max_consecutive_days" integer,
	"requires_document" boolean DEFAULT false,
	"requires_approval" boolean DEFAULT true,
	"carry_forward_enabled" boolean DEFAULT false,
	"max_carry_forward" integer DEFAULT 0,
	"min_notice_days" integer DEFAULT 0,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leave_policies_leave_type_unique" UNIQUE("leave_type")
);
--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "approver_id" uuid;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "emergency_contact" varchar(100);--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "handover_notes" text;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "document_url" text;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "is_manual_entry" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "manual_entry_by" uuid;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_manual_entry_by_users_id_fk" FOREIGN KEY ("manual_entry_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;