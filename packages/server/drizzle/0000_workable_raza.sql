CREATE TABLE "scheduled_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cron_expression" text NOT NULL,
	"command" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"device" text NOT NULL,
	"board" text NOT NULL,
	"value" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sr_device_board_ts_idx" ON "sensor_readings" USING btree ("device","board","created_at");