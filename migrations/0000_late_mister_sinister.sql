CREATE TYPE "public"."event_type" AS ENUM('drill', 'class');--> statement-breakpoint
CREATE TYPE "public"."flight_type" AS ENUM('alpha', 'tango', 'both');--> statement-breakpoint
CREATE TABLE "command_execution_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"command_id" uuid NOT NULL,
	"drill_plan_id" uuid NOT NULL,
	"flight_type" "flight_type" NOT NULL,
	"executed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drill_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "event_type" NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drill_plan_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drill_plan_id" uuid,
	"command_id" uuid,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drill_plan_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drill_plan_id" uuid NOT NULL,
	"content" text NOT NULL,
	"author_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drill_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"flight_assignment" "flight_type" NOT NULL,
	"command_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "command_execution_history" ADD CONSTRAINT "command_execution_history_command_id_drill_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."drill_commands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_execution_history" ADD CONSTRAINT "command_execution_history_drill_plan_id_drill_plans_id_fk" FOREIGN KEY ("drill_plan_id") REFERENCES "public"."drill_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_plan_files" ADD CONSTRAINT "drill_plan_files_drill_plan_id_drill_plans_id_fk" FOREIGN KEY ("drill_plan_id") REFERENCES "public"."drill_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_plan_files" ADD CONSTRAINT "drill_plan_files_command_id_drill_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."drill_commands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_plan_notes" ADD CONSTRAINT "drill_plan_notes_drill_plan_id_drill_plans_id_fk" FOREIGN KEY ("drill_plan_id") REFERENCES "public"."drill_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_plans" ADD CONSTRAINT "drill_plans_command_id_drill_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."drill_commands"("id") ON DELETE no action ON UPDATE no action;