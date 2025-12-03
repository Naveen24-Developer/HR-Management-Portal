-- Add new attendance status tracking columns
ALTER TABLE "attendance" ADD COLUMN "check_in_status" varchar(20);
ALTER TABLE "attendance" ADD COLUMN "check_in_duration" integer DEFAULT 0;
ALTER TABLE "attendance" ADD COLUMN "check_out_status" varchar(20);
ALTER TABLE "attendance" ADD COLUMN "check_out_duration" integer DEFAULT 0;
