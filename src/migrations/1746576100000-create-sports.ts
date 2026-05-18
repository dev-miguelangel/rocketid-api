import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSports1746576100000 implements MigrationInterface {
  name = 'CreateSports1746576100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sports" (
        "id"        SERIAL                 NOT NULL,
        "name"      character varying(100) NOT NULL,
        "label"     character varying(150) NOT NULL,
        "icon"      character varying(100) NOT NULL,
        "color"     character varying(20)  NOT NULL,
        "status"    boolean                NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP              NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP              NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sports" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sports"`);
  }
}
