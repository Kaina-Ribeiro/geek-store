import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { featuredToSlides, HERO_DEFAULTS } from '../lib/painel/hero'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_hero_slides_kind" AS ENUM('game', 'campaign');
  CREATE TYPE "public"."enum__home_hero_v_version_slides_kind" AS ENUM('game', 'campaign');
  CREATE TABLE "home_hero_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_home_hero_slides_kind" DEFAULT 'game' NOT NULL,
  	"game_id" integer,
  	"campaign_title" varchar,
  	"campaign_image_id" integer,
  	"campaign_link" varchar DEFAULT '/loja',
  	"visible" boolean DEFAULT true
  );
  
  CREATE TABLE "home_hero" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT E'Continue\nde onde você\nparou.' NOT NULL,
  	"subtitle" varchar DEFAULT 'Lacrados e seminovos com laudo de cada disco, do PS2 ao Switch 2. Separados à mão em Taubaté e enviados para todo o Brasil.',
  	"cta_label" varchar DEFAULT 'Abrir a loja' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_home_hero_v_version_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__home_hero_v_version_slides_kind" DEFAULT 'game' NOT NULL,
  	"game_id" integer,
  	"campaign_title" varchar,
  	"campaign_image_id" integer,
  	"campaign_link" varchar DEFAULT '/loja',
  	"visible" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_hero_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_title" varchar DEFAULT E'Continue\nde onde você\nparou.' NOT NULL,
  	"version_subtitle" varchar DEFAULT 'Lacrados e seminovos com laudo de cada disco, do PS2 ao Switch 2. Separados à mão em Taubaté e enviados para todo o Brasil.',
  	"version_cta_label" varchar DEFAULT 'Abrir a loja' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "home_hero_slides" ADD CONSTRAINT "home_hero_slides_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_hero_slides" ADD CONSTRAINT "home_hero_slides_campaign_image_id_media_id_fk" FOREIGN KEY ("campaign_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_hero_slides" ADD CONSTRAINT "home_hero_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_hero_v_version_slides" ADD CONSTRAINT "_home_hero_v_version_slides_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_hero_v_version_slides" ADD CONSTRAINT "_home_hero_v_version_slides_campaign_image_id_media_id_fk" FOREIGN KEY ("campaign_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_hero_v_version_slides" ADD CONSTRAINT "_home_hero_v_version_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_hero_slides_order_idx" ON "home_hero_slides" USING btree ("_order");
  CREATE INDEX "home_hero_slides_parent_id_idx" ON "home_hero_slides" USING btree ("_parent_id");
  CREATE INDEX "home_hero_slides_game_idx" ON "home_hero_slides" USING btree ("game_id");
  CREATE INDEX "home_hero_slides_campaign_image_idx" ON "home_hero_slides" USING btree ("campaign_image_id");
  CREATE INDEX "_home_hero_v_version_slides_order_idx" ON "_home_hero_v_version_slides" USING btree ("_order");
  CREATE INDEX "_home_hero_v_version_slides_parent_id_idx" ON "_home_hero_v_version_slides" USING btree ("_parent_id");
  CREATE INDEX "_home_hero_v_version_slides_game_idx" ON "_home_hero_v_version_slides" USING btree ("game_id");
  CREATE INDEX "_home_hero_v_version_slides_campaign_image_idx" ON "_home_hero_v_version_slides" USING btree ("campaign_image_id");
  CREATE INDEX "_home_hero_v_created_at_idx" ON "_home_hero_v" USING btree ("created_at");
  CREATE INDEX "_home_hero_v_updated_at_idx" ON "_home_hero_v" USING btree ("updated_at");`)

  // The games marked "featured" become the banner's first slides, before the
  // column goes away.
  const featured = await db.execute(sql`SELECT id, updated_at FROM games WHERE featured = true`)
  const rows = (featured.rows as { id: number; updated_at: string | Date }[]).map((r) => ({
    id: Number(r.id),
    updatedAt: new Date(r.updated_at).toISOString(),
  }))
  await payload.updateGlobal({
    slug: 'home-hero',
    data: { ...HERO_DEFAULTS, slides: featuredToSlides(rows) },
    req,
  })

  await db.execute(sql`ALTER TABLE "games" DROP COLUMN "featured";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Game slides become "featured" games again.
  await db.execute(sql`
   ALTER TABLE "games" ADD COLUMN "featured" boolean DEFAULT false;
  UPDATE "games" SET "featured" = true
    WHERE "id" IN (SELECT "game_id" FROM "home_hero_slides" WHERE "kind" = 'game' AND "game_id" IS NOT NULL);`)

  await db.execute(sql`
   DROP TABLE "home_hero_slides" CASCADE;
  DROP TABLE "home_hero" CASCADE;
  DROP TABLE "_home_hero_v_version_slides" CASCADE;
  DROP TABLE "_home_hero_v" CASCADE;
  DROP TYPE "public"."enum_home_hero_slides_kind";
  DROP TYPE "public"."enum__home_hero_v_version_slides_kind";`)
}
