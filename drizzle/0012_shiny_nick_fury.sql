ALTER TABLE "attendance" ADD COLUMN "check_in_status" varchar(20);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_in_duration" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_out_status" varchar(20);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_out_duration" integer DEFAULT 0;