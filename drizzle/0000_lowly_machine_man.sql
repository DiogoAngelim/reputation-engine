CREATE TYPE "public"."executive_public_level" AS ENUM('STANDARD', 'SELECT', 'ELITE');--> statement-breakpoint
CREATE TYPE "public"."reputation_event_type" AS ENUM('CONTRACT_COMPLETED', 'CONTRACT_BREACH', 'LATE_COMPLETION', 'AUCTION_WON', 'AUCTION_CANCELED', 'PAYMENT_CONFIRMED', 'SLOT_UNFILLED');--> statement-breakpoint
CREATE TABLE "executive_reputations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"executive_id" text NOT NULL,
	"completion_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"on_time_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"breach_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"slot_fill_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"avg_clearing_price" integer DEFAULT 0 NOT NULL,
	"price_trend_score" numeric(8, 6) DEFAULT '0' NOT NULL,
	"reliability_score" numeric(8, 6) DEFAULT '0' NOT NULL,
	"reputation_score" numeric(6, 2) DEFAULT '0' NOT NULL,
	"public_level" "executive_public_level" DEFAULT 'STANDARD' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "executive_reputations_executive_id_unique" UNIQUE("executive_id")
);
--> statement-breakpoint
CREATE TABLE "owner_reputations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"payment_reliability" numeric(8, 6) DEFAULT '0' NOT NULL,
	"cancellation_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"breach_initiation_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"bid_consistency_score" numeric(8, 6) DEFAULT '0' NOT NULL,
	"engagement_score" numeric(8, 6) DEFAULT '0' NOT NULL,
	"internal_risk_score" numeric(6, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_reputations_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE "reputation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"event_id" text NOT NULL,
	"type" "reputation_event_type" NOT NULL,
	"executive_id" text,
	"owner_id" text,
	"reference_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reputation_events_source_event_uidx" ON "reputation_events" USING btree ("source","event_id");