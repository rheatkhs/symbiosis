CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"remote_name" varchar(255) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"storage_used" bigint DEFAULT 0 NOT NULL,
	"storage_limit" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_remote_name_unique" UNIQUE("remote_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_config" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_path" varchar(1000) NOT NULL,
	"file_size" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_account_id_idx" ON "transfers" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_status_idx" ON "transfers" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_started_at_idx" ON "transfers" ("started_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
