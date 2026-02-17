-- Phase 3: Reference Data Cache + Staging Sync Status
-- Phase 4: Add fund/GL account columns to expenses

-- Drop QBO tables (Phase 1 cleanup)
DROP TABLE IF EXISTS "qbo_tokens";
--> statement-breakpoint
DROP TABLE IF EXISTS "qbo_cache";
--> statement-breakpoint

-- Create reference data cache table
CREATE TABLE "reference_data_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint

-- Create staging sync status table (local tracking of financial-system submissions)
CREATE TABLE "staging_sync_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"expense_id" uuid NOT NULL,
	"source_record_id" text NOT NULL,
	"fund_id" integer NOT NULL,
	"gl_account_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"last_checked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "staging_sync_status" ADD CONSTRAINT "staging_sync_status_report_id_expense_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."expense_reports"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staging_sync_status" ADD CONSTRAINT "staging_sync_status_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "staging_sync_report_expense_idx" ON "staging_sync_status" USING btree ("report_id","expense_id");
--> statement-breakpoint

-- Phase 4: Add fund and GL account columns to expenses
ALTER TABLE "expenses" ADD COLUMN "fund_id" integer;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "gl_account_id" integer;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "fund_name" text;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "gl_account_name" text;
