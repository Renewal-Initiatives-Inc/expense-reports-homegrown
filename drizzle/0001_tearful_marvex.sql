CREATE TABLE "email_auto_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_email" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "source" text DEFAULT 'camera' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "email_received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "email_message_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "duplicate_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "email_auto_replies_sender_idx" ON "email_auto_replies" USING btree ("sender_email","sent_at");--> statement-breakpoint
CREATE INDEX "user_emails_user_id_idx" ON "user_emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_emails_email_idx" ON "user_emails" USING btree ("email");