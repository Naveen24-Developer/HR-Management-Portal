ALTER TABLE "attendance" ADD COLUMN "check_in_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_in_latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_in_longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "restriction_passed" boolean;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "restriction_failure_code" varchar(50);