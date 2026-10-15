-- Baseline (issue #30): the live database's schema as of 2026-10-15, captured with
-- `supabase db dump`, plus the private storage buckets the server uses.
--
-- Already applied to the live project (marked with `supabase migration repair`); it's what a
-- fresh project (`supabase start` / `supabase db reset`) is built from. Change the schema with
-- a NEW migration (`npx supabase migration new <name>`), never by editing this file.
--
-- The hand-run scripts this replaces (travel-crew.sql, profiles.sql, ...) are in git history.



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."trips_before_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'UPDATE' then
    new.revision := coalesce(old.revision, 0) + 1;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."trips_before_write"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."catalog_spots" (
    "id" bigint NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "address" "text" NOT NULL,
    "coords" double precision[],
    "region" "text",
    "img" "text",
    "links" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "catalog_spots_category_check" CHECK (("category" = ANY (ARRAY['extras'::"text", 'food'::"text"])))
);


ALTER TABLE "public"."catalog_spots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."catalog_spots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."catalog_spots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."catalog_spots_id_seq" OWNED BY "public"."catalog_spots"."id";



CREATE TABLE IF NOT EXISTS "public"."day_selections" (
    "id" bigint NOT NULL,
    "day_key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "coords" double precision[] NOT NULL,
    "region" "text",
    "img" "text",
    "links" "jsonb" DEFAULT '{}'::"jsonb",
    "position" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."day_selections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."day_selections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."day_selections_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."day_selections_id_seq" OWNED BY "public"."day_selections"."id";



CREATE TABLE IF NOT EXISTS "public"."generation_jobs" (
    "trip_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "attempts" integer DEFAULT 1 NOT NULL,
    "worker" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "heartbeat_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_error" "text",
    "reservation_id" bigint,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "generation_jobs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'done'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."generation_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "member_reservations_kind_check" CHECK (("kind" = ANY (ARRAY['flight'::"text", 'hotel'::"text"])))
);


ALTER TABLE "public"."member_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" NOT NULL,
    "nickname" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "trip_id" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "phone" "text",
    "birthday" "date",
    "gender" "text",
    "bio" "text",
    "accessibility_needs" "text"[],
    "accessibility_notes" "text",
    "emergency_name" "text",
    "emergency_relationship" "text",
    "emergency_phone" "text",
    "emergency_email" "text",
    "share_emergency" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_accessibility_notes_check" CHECK (("char_length"("accessibility_notes") <= 500)),
    CONSTRAINT "profiles_bio_check" CHECK (("char_length"("bio") <= 280)),
    CONSTRAINT "profiles_emergency_email_check" CHECK (("char_length"("emergency_email") <= 200)),
    CONSTRAINT "profiles_emergency_name_check" CHECK (("char_length"("emergency_name") <= 100)),
    CONSTRAINT "profiles_emergency_phone_check" CHECK (("char_length"("emergency_phone") <= 40)),
    CONSTRAINT "profiles_emergency_relationship_check" CHECK (("char_length"("emergency_relationship") <= 60)),
    CONSTRAINT "profiles_gender_check" CHECK (("char_length"("gender") <= 60)),
    CONSTRAINT "profiles_phone_check" CHECK (("char_length"("phone") <= 40))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_travelers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "relation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "saved_travelers_email_check" CHECK (("char_length"("email") <= 200)),
    CONSTRAINT "saved_travelers_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "saved_travelers_relation_check" CHECK (("char_length"("relation") <= 40))
);


ALTER TABLE "public"."saved_travelers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."travel_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "label" "text",
    "expires_on" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attachment_path" "text",
    "attachment_type" "text",
    "attachment_name" "text",
    "attachment_size" integer,
    "attachment_uploaded_at" timestamp with time zone,
    "number_encrypted" "text",
    "number_last4" "text",
    CONSTRAINT "travel_documents_attachment_name_check" CHECK (("char_length"("attachment_name") <= 100)),
    CONSTRAINT "travel_documents_attachment_size_check" CHECK ((("attachment_size" >= 0) AND ("attachment_size" <= 10485760))),
    CONSTRAINT "travel_documents_attachment_type_check" CHECK (("attachment_type" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text", 'application/pdf'::"text"]))),
    CONSTRAINT "travel_documents_kind_check" CHECK (("kind" = ANY (ARRAY['passport'::"text", 'known_traveler'::"text", 'drivers_license'::"text", 'visa'::"text", 'insurance'::"text", 'frequent_flyer'::"text", 'vaccination'::"text", 'other'::"text"]))),
    CONSTRAINT "travel_documents_label_check" CHECK (("char_length"("label") <= 100)),
    CONSTRAINT "travel_documents_notes_check" CHECK (("char_length"("notes") <= 500)),
    CONSTRAINT "travel_documents_number_last4_check" CHECK (("char_length"("number_last4") <= 4))
);


ALTER TABLE "public"."travel_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_food_spots" (
    "trip_id" "uuid" NOT NULL,
    "city" "text" NOT NULL,
    "spots" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "homebase" "jsonb",
    "homebase_checked_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_food_spots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_generations" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_generations" OWNER TO "postgres";


ALTER TABLE "public"."trip_generations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."trip_generations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."trip_invites" (
    "trip_id" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "require_approval" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."trip_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "avatar_url" "text",
    "guest_token" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    CONSTRAINT "trip_members_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'guest'::"text"]))),
    CONSTRAINT "trip_members_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text"])))
);


ALTER TABLE "public"."trip_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "uploaded_by" "uuid",
    "member_id" "uuid",
    "uploader_name" "text" NOT NULL,
    "uploader_avatar_url" "text",
    "day" integer,
    "caption" "text",
    "path" "text" NOT NULL,
    "thumb_path" "text" NOT NULL,
    "type" "text" NOT NULL,
    "size" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trip_photos_caption_check" CHECK (("char_length"("caption") <= 200)),
    CONSTRAINT "trip_photos_day_check" CHECK ((("day" >= 1) AND ("day" <= 60))),
    CONSTRAINT "trip_photos_size_check" CHECK ((("size" >= 0) AND ("size" <= 10485760))),
    CONSTRAINT "trip_photos_type_check" CHECK (("type" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text"]))),
    CONSTRAINT "trip_photos_uploader_name_check" CHECK (("char_length"("uploader_name") <= 100))
);


ALTER TABLE "public"."trip_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "destination" "text",
    "cities" "text"[],
    "duration" integer,
    "travel_style" "text",
    "vacation_type" "text",
    "itinerary_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'ready'::"text" NOT NULL,
    "error" "text",
    "started_at" timestamp with time zone,
    "pdf_downloaded_at" timestamp with time zone,
    "revision" bigint DEFAULT 0 NOT NULL,
    CONSTRAINT "trips_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'ready'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


ALTER TABLE ONLY "public"."catalog_spots" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."catalog_spots_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."day_selections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."day_selections_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."catalog_spots"
    ADD CONSTRAINT "catalog_spots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."day_selections"
    ADD CONSTRAINT "day_selections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generation_jobs"
    ADD CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("trip_id");



ALTER TABLE ONLY "public"."member_reservations"
    ADD CONSTRAINT "member_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_travelers"
    ADD CONSTRAINT "saved_travelers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."travel_documents"
    ADD CONSTRAINT "travel_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_food_spots"
    ADD CONSTRAINT "trip_food_spots_pkey" PRIMARY KEY ("trip_id", "city");



ALTER TABLE ONLY "public"."trip_generations"
    ADD CONSTRAINT "trip_generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_invites"
    ADD CONSTRAINT "trip_invites_pkey" PRIMARY KEY ("trip_id");



ALTER TABLE ONLY "public"."trip_invites"
    ADD CONSTRAINT "trip_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_guest_token_key" UNIQUE ("guest_token");



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_trip_id_user_id_key" UNIQUE ("trip_id", "user_id");



ALTER TABLE ONLY "public"."trip_photos"
    ADD CONSTRAINT "trip_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



CREATE INDEX "generation_jobs_running_idx" ON "public"."generation_jobs" USING "btree" ("heartbeat_at") WHERE ("status" = 'running'::"text");



CREATE INDEX "member_reservations_member_idx" ON "public"."member_reservations" USING "btree" ("member_id");



CREATE INDEX "notifications_user_created_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "saved_travelers_owner_email_idx" ON "public"."saved_travelers" USING "btree" ("owner_id", "lower"("email")) WHERE ("email" IS NOT NULL);



CREATE INDEX "saved_travelers_owner_idx" ON "public"."saved_travelers" USING "btree" ("owner_id", "name");



CREATE INDEX "travel_documents_user_idx" ON "public"."travel_documents" USING "btree" ("user_id", "created_at");



CREATE INDEX "trip_generations_user_created_idx" ON "public"."trip_generations" USING "btree" ("user_id", "created_at");



CREATE INDEX "trip_members_user_id_idx" ON "public"."trip_members" USING "btree" ("user_id");



CREATE INDEX "trip_photos_trip_idx" ON "public"."trip_photos" USING "btree" ("trip_id", "created_at");



CREATE INDEX "trips_status_idx" ON "public"."trips" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'failed'::"text"]));



CREATE OR REPLACE TRIGGER "trips_before_write" BEFORE INSERT OR UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."trips_before_write"();



ALTER TABLE ONLY "public"."catalog_spots"
    ADD CONSTRAINT "catalog_spots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."day_selections"
    ADD CONSTRAINT "day_selections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."generation_jobs"
    ADD CONSTRAINT "generation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_reservations"
    ADD CONSTRAINT "member_reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."trip_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_reservations"
    ADD CONSTRAINT "member_reservations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_travelers"
    ADD CONSTRAINT "saved_travelers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."travel_documents"
    ADD CONSTRAINT "travel_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_food_spots"
    ADD CONSTRAINT "trip_food_spots_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_generations"
    ADD CONSTRAINT "trip_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_invites"
    ADD CONSTRAINT "trip_invites_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_photos"
    ADD CONSTRAINT "trip_photos_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."trip_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_photos"
    ADD CONSTRAINT "trip_photos_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_photos"
    ADD CONSTRAINT "trip_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow all public access" ON "public"."catalog_spots" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all public access" ON "public"."day_selections" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all public access" ON "public"."members" USING (true) WITH CHECK (true);



CREATE POLICY "Members can see their own memberships" ON "public"."trip_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Owners manage their trips' food spots" ON "public"."trip_food_spots" USING ((EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_food_spots"."trip_id") AND ("t"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_food_spots"."trip_id") AND ("t"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their profile" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own trips" ON "public"."trips" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own trips" ON "public"."trips" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can mark their notifications read" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can update their own trips" ON "public"."trips" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can view their own trips" ON "public"."trips" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their saved travelers" ON "public"."saved_travelers" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "catalog:delete-own" ON "public"."catalog_spots" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "catalog:team-read" ON "public"."catalog_spots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE ("m"."id" = "auth"."uid"()))));



CREATE POLICY "catalog:team-update" ON "public"."catalog_spots" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE ("m"."id" = "auth"."uid"()))));



CREATE POLICY "catalog:team-write" ON "public"."catalog_spots" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE ("m"."id" = "auth"."uid"()))));



ALTER TABLE "public"."catalog_spots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."day_selections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generation_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_travelers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "selections:delete-own" ON "public"."day_selections" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "selections:team-insert" ON "public"."day_selections" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE ("m"."id" = "auth"."uid"()))));



CREATE POLICY "selections:team-read" ON "public"."day_selections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE ("m"."id" = "auth"."uid"()))));



CREATE POLICY "selections:team-update" ON "public"."day_selections" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE ("m"."id" = "auth"."uid"()))));



ALTER TABLE "public"."travel_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_food_spots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_generations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."trips";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."trips_before_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."trips_before_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trips_before_write"() TO "service_role";


















GRANT ALL ON TABLE "public"."catalog_spots" TO "anon";
GRANT ALL ON TABLE "public"."catalog_spots" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_spots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."catalog_spots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."catalog_spots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."catalog_spots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."day_selections" TO "anon";
GRANT ALL ON TABLE "public"."day_selections" TO "authenticated";
GRANT ALL ON TABLE "public"."day_selections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."day_selections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."day_selections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."day_selections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."generation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."generation_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."generation_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."member_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."saved_travelers" TO "anon";
GRANT ALL ON TABLE "public"."saved_travelers" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_travelers" TO "service_role";



GRANT ALL ON TABLE "public"."travel_documents" TO "service_role";



GRANT ALL ON TABLE "public"."trip_food_spots" TO "anon";
GRANT ALL ON TABLE "public"."trip_food_spots" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_food_spots" TO "service_role";



GRANT ALL ON TABLE "public"."trip_generations" TO "anon";
GRANT ALL ON TABLE "public"."trip_generations" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_generations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."trip_generations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."trip_generations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."trip_generations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."trip_invites" TO "anon";
GRANT ALL ON TABLE "public"."trip_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_invites" TO "service_role";



GRANT ALL ON TABLE "public"."trip_members" TO "anon";
GRANT ALL ON TABLE "public"."trip_members" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_members" TO "service_role";



GRANT ALL ON TABLE "public"."trip_photos" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































-- pg_dump records grants but not revokes. On the live project the browser roles have no
-- privileges at all on these server-only tables; without this, replaying the dump would
-- leave them with Supabase's default grants (still blocked by RLS, but not the same).
revoke all on table public.member_reservations, public.travel_documents, public.trip_photos from anon, authenticated;

-- Private buckets; only the server (service role) reads and writes them, so they have no
-- storage policies. travel-documents: encrypted attachments (issue #55). trip-photos: the
-- shared trip album.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('travel-documents', 'travel-documents', false, 10486000, array['application/octet-stream']),
  ('trip-photos', 'trip-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
