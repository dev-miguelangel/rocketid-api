import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeams1746576200000 implements MigrationInterface {
  name = 'CreateTeams1746576200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."teams_gender_enum" AS ENUM('male', 'female', 'mixed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."team_members_role_enum" AS ENUM('owner', 'captain', 'member')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."team_members_status_enum" AS ENUM('active', 'pending', 'rejected')`,
    );

    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id"          uuid                          NOT NULL DEFAULT uuid_generate_v4(),
        "name"        character varying(100)        NOT NULL,
        "description" text,
        "icon"        character varying(100)        NOT NULL,
        "color"       character varying(20)         NOT NULL,
        "gender"      "public"."teams_gender_enum"  NOT NULL,
        "sport_id"    integer                       NOT NULL,
        "owner_id"    uuid                          NOT NULL,
        "createdAt"   TIMESTAMP                     NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP                     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "id"        uuid                                NOT NULL DEFAULT uuid_generate_v4(),
        "team_id"   uuid                                NOT NULL,
        "user_id"   uuid                                NOT NULL,
        "role"      "public"."team_members_role_enum"   NOT NULL DEFAULT 'member',
        "status"    "public"."team_members_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP                           NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP                           NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_team_members_team_user" UNIQUE ("team_id", "user_id"),
        CONSTRAINT "PK_team_members" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "teams"
        ADD CONSTRAINT "FK_teams_sport_id"
        FOREIGN KEY ("sport_id") REFERENCES "sports"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "teams"
        ADD CONSTRAINT "FK_teams_owner_id"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "team_members"
        ADD CONSTRAINT "FK_team_members_team_id"
        FOREIGN KEY ("team_id") REFERENCES "teams"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "team_members"
        ADD CONSTRAINT "FK_team_members_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_team_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_owner_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_sport_id"`,
    );
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TYPE "public"."team_members_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."team_members_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."teams_gender_enum"`);
  }
}
