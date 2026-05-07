import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1746576000000 implements MigrationInterface {
  name = 'InitialSchema1746576000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`);
    await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'blocked')`);
    await queryRunner.query(
      `CREATE TYPE "public"."profiles_blood_type_enum" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'sin informacion')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"               uuid                          NOT NULL DEFAULT uuid_generate_v4(),
        "googleId"         character varying             NOT NULL,
        "email"            character varying             NOT NULL,
        "name"             character varying             NOT NULL,
        "avatar"           character varying,
        "role"             "public"."users_role_enum"    NOT NULL DEFAULT 'user',
        "status"           "public"."users_status_enum"  NOT NULL DEFAULT 'active',
        "onboardingStep"   integer                       NOT NULL DEFAULT '0',
        "refreshTokenHash" character varying,
        "createdAt"        TIMESTAMP                     NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP                     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId"),
        CONSTRAINT "UQ_users_email"    UNIQUE ("email"),
        CONSTRAINT "PK_users"          PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "profiles" (
        "id"                           uuid                               NOT NULL DEFAULT uuid_generate_v4(),
        "userId"                       uuid                               NOT NULL,
        "phone"                        character varying,
        "alias"                        character varying                  NOT NULL,
        "stringId"                     character varying(6)               NOT NULL,
        "bloodType"                    "public"."profiles_blood_type_enum",
        "allergies"                    text,
        "conditions"                   text,
        "medications"                  text,
        "emergencyContactName"         character varying,
        "emergencyContactPhone"        character varying,
        "emergencyContactRelationship" character varying,
        "createdAt"                    TIMESTAMP                          NOT NULL DEFAULT now(),
        "updatedAt"                    TIMESTAMP                          NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_profiles_alias"    UNIQUE ("alias"),
        CONSTRAINT "UQ_profiles_stringId" UNIQUE ("stringId"),
        CONSTRAINT "PK_profiles"          PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "profiles"
        ADD CONSTRAINT "FK_profiles_userId"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "profile_contacts" (
        "owner_id"   uuid NOT NULL,
        "contact_id" uuid NOT NULL,
        CONSTRAINT "PK_profile_contacts" PRIMARY KEY ("owner_id", "contact_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_profile_contacts_owner_id"   ON "profile_contacts" ("owner_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_profile_contacts_contact_id" ON "profile_contacts" ("contact_id")`);

    await queryRunner.query(`
      ALTER TABLE "profile_contacts"
        ADD CONSTRAINT "FK_profile_contacts_owner_id"
        FOREIGN KEY ("owner_id") REFERENCES "profiles"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "profile_contacts"
        ADD CONSTRAINT "FK_profile_contacts_contact_id"
        FOREIGN KEY ("contact_id") REFERENCES "profiles"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profile_contacts" DROP CONSTRAINT "FK_profile_contacts_contact_id"`);
    await queryRunner.query(`ALTER TABLE "profile_contacts" DROP CONSTRAINT "FK_profile_contacts_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_profile_contacts_contact_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_profile_contacts_owner_id"`);
    await queryRunner.query(`DROP TABLE "profile_contacts"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profiles_userId"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."profiles_blood_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
