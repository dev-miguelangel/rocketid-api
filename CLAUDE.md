# Project Instructions

## Language Rules

All code must be written in **English**:
- Variable names, function names, class names, interfaces, types
- File names and directory names
- Comments inside code
- Git commit messages
- Environment variable names
- Database table names, column names, index names, constraint names, and migration file names
- TypeORM entity class names and property names
- API endpoint paths and JSON property names
- Test descriptions (`describe`, `it`, `test` blocks)

All content visible to the **end user** must be in **Spanish**:
- HTTP response messages and error messages returned by the API
- Validation error messages
- Log messages intended for operators
- Any string the user reads in a UI or API response body

## Stack

- NestJS 11 + TypeScript
- TypeORM + PostgreSQL
- Jest for unit tests

## Entity Conventions

- Every entity must include `@CreateDateColumn() createdAt` and `@UpdateDateColumn() updatedAt`. TypeORM manages these automatically — never set them manually.

## Testing

- Every `src/**/*.ts` file (except `main.ts`) must have a corresponding `src/**/*.spec.ts`
- The `test-guardian` agent generates and validates specs automatically after each edit
- Do not modify source files to make a failing test pass — fix the test instead
- `synchronize: true` is only active when `NODE_ENV !== 'production'`
