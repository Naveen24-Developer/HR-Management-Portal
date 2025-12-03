ALTER TABLE "roles" ADD COLUMN "sidebar_permissions" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "page_permissions" jsonb DEFAULT '[]';