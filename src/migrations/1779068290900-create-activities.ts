import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivities1779068290900 implements MigrationInterface {
  name = 'CreateActivities1779068290900';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."activities_type_enum" AS ENUM('challenge', 'training', 'open_call')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activities_status_enum" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activities_training_mode_enum" AS ENUM('classic', 'internal_challenge')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activities_open_call_mode_enum" AS ENUM('open', 'public', 'private')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_participants_status_enum" AS ENUM('invited', 'pending', 'confirmed', 'declined', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_participants_subteam_enum" AS ENUM('one', 'two')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activity_participants_participant_role_enum" AS ENUM('starter', 'reserve')`,
    );

    await queryRunner.query(`
      CREATE TABLE "activities" (
        "id"                    uuid                                          NOT NULL DEFAULT uuid_generate_v4(),
        "type"                  "public"."activities_type_enum"               NOT NULL,
        "status"                "public"."activities_status_enum"             NOT NULL DEFAULT 'scheduled',
        "title"                 character varying(150)                        NOT NULL,
        "description"           text,
        "sport_id"              integer                                       NOT NULL,
        "requires_registration" boolean                                       NOT NULL DEFAULT false,
        "registration_deadline" TIMESTAMP,
        "starts_at"             TIMESTAMP                                     NOT NULL,
        "ends_at"               TIMESTAMP                                     NOT NULL,
        "latitude"              numeric(10,7)                                 NOT NULL,
        "longitude"             numeric(10,7)                                 NOT NULL,
        "location_instructions" text,
        "organizer_id"          uuid                                          NOT NULL,
        "team_one_id"           uuid,
        "team_two_id"           uuid,
        "team_id"               uuid,
        "training_mode"         "public"."activities_training_mode_enum",
        "players_per_subteam"   integer,
        "reserves_per_subteam"  integer,
        "allow_externals"       boolean                                       NOT NULL DEFAULT false,
        "open_call_mode"        "public"."activities_open_call_mode_enum",
        "max_participants"      integer,
        "createdAt"             TIMESTAMP                                     NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMP                                     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activities" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "activity_participants" (
        "id"               uuid                                                   NOT NULL DEFAULT uuid_generate_v4(),
        "activity_id"      uuid                                                   NOT NULL,
        "user_id"          uuid                                                   NOT NULL,
        "status"           "public"."activity_participants_status_enum"           NOT NULL DEFAULT 'pending',
        "subteam"          "public"."activity_participants_subteam_enum",
        "participant_role" "public"."activity_participants_participant_role_enum",
        "is_external"      boolean                                                NOT NULL DEFAULT false,
        "invited_by_id"    uuid,
        "responded_at"     TIMESTAMP,
        "createdAt"        TIMESTAMP                                              NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP                                              NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_activity_participants_activity_user" UNIQUE ("activity_id", "user_id"),
        CONSTRAINT "PK_activity_participants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_activities_starts_at" ON "activities" ("starts_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_type" ON "activities" ("type")`,
    );

    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "FK_activities_sport_id"
        FOREIGN KEY ("sport_id") REFERENCES "sports"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "FK_activities_organizer_id"
        FOREIGN KEY ("organizer_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "FK_activities_team_one_id"
        FOREIGN KEY ("team_one_id") REFERENCES "teams"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "FK_activities_team_two_id"
        FOREIGN KEY ("team_two_id") REFERENCES "teams"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "FK_activities_team_id"
        FOREIGN KEY ("team_id") REFERENCES "teams"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_participants"
        ADD CONSTRAINT "FK_activity_participants_activity_id"
        FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_participants"
        ADD CONSTRAINT "FK_activity_participants_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_participants"
        ADD CONSTRAINT "FK_activity_participants_invited_by_id"
        FOREIGN KEY ("invited_by_id") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_participants" DROP CONSTRAINT "FK_activity_participants_invited_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_participants" DROP CONSTRAINT "FK_activity_participants_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_participants" DROP CONSTRAINT "FK_activity_participants_activity_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_team_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_team_two_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_team_one_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_organizer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_sport_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_starts_at"`);
    await queryRunner.query(`DROP TABLE "activity_participants"`);
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(
      `DROP TYPE "public"."activity_participants_participant_role_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."activity_participants_subteam_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."activity_participants_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."activities_open_call_mode_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."activities_training_mode_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."activities_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."activities_type_enum"`);
  }
}
