#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src');
const OUT = path.resolve(__dirname, '../docs/references_api.md');
const BASE_URL = 'http://localhost:3000';

// ── file helpers ──────────────────────────────────────────────────────────────

function findFiles(dir, predicate) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...findFiles(full, predicate));
    else if (predicate(entry.name)) result.push(full);
  }
  return result;
}

// ── entity parser ─────────────────────────────────────────────────────────────

function parseEntity(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  const classMatch = src.match(/export class (\w+)/);
  if (!classMatch) return null;

  const tableMatch = src.match(/@Entity\(['"`]([^'"`]+)['"`]\)/);
  const name = classMatch[1];
  const table = tableMatch ? tableMatch[1] : name.toLowerCase() + 's';

  // --- columns -----------------------------------------------------------------
  const columns = [];

  // @PrimaryGeneratedColumn
  const pkRe = /@PrimaryGeneratedColumn\(['"`]?(\w+)['"`]?\)\s*\n\s+(\w+)!/m;
  const pkM = src.match(pkRe);
  if (pkM) {
    columns.push({
      name: pkM[2],
      type: pkM[1] === 'uuid' ? 'uuid' : 'int',
      constraints: 'PK AUTO',
    });
  }

  // @Column(...)
  const colRe = /@Column\(({[^}]*}|)\)\s*\n\s+(\w+)!?:\s*([^\n;]+)/gm;
  let m;
  while ((m = colRe.exec(src)) !== null) {
    const opts = m[1];
    const colName = m[2];
    const tsProp = m[3].trim().replace(/\s*\|\s*null$/, '');

    const typeM = opts.match(/type:\s*['"`]([^'"`]+)['"`]/);
    const enumM = opts.match(/enum:\s*(\w+)/);
    const unique = /unique:\s*true/.test(opts);
    const nullable = /nullable:\s*true/.test(opts);
    const lengthM = opts.match(/length:\s*(\d+)/);

    let colType = typeM ? typeM[1] : tsProp;
    if (enumM) colType = `enum(${enumM[1]})`;

    const parts = [];
    if (unique) parts.push('UNIQUE');
    if (nullable) parts.push('nullable');
    else parts.push('NOT NULL');
    if (lengthM) parts.push(`len:${lengthM[1]}`);

    columns.push({ name: colName, type: colType, constraints: parts.join(', ') });
  }

  // Timestamps
  if (/@CreateDateColumn/.test(src)) columns.push({ name: 'createdAt', type: 'timestamp', constraints: 'auto' });
  if (/@UpdateDateColumn/.test(src)) columns.push({ name: 'updatedAt', type: 'timestamp', constraints: 'auto' });

  // --- relations ---------------------------------------------------------------
  const relations = [];
  // Match the decorator and look ahead 400 chars for @JoinColumn and the property name
  const relRe = /@(OneToOne|OneToMany|ManyToOne|ManyToMany)\(\s*\(\)\s*=>\s*(\w+)/gm;
  while ((m = relRe.exec(src)) !== null) {
    const relType = m[1];
    const target = m[2];
    // look-ahead block: from this decorator up to the property declaration
    const lookAhead = src.slice(m.index, m.index + 400);
    const owning = /@JoinColumn/.test(lookAhead) || /@JoinTable/.test(lookAhead);
    const propM = lookAhead.match(/\n\s+(\w+)!/);
    const fieldName = propM ? propM[1] : '?';
    relations.push({ type: relType, target, fieldName, owning });
  }

  return { name, table, columns, relations };
}

// ── controller parser ─────────────────────────────────────────────────────────

function parseController(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  const classMatch = src.match(/export class (\w+)/);
  if (!classMatch) return null;

  const prefixM = src.match(/@Controller\(['"`]([^'"`]*)['"`]\)/);
  const prefix = prefixM ? prefixM[1] : '';

  // class-level guard
  const beforeConstructor = src.slice(0, src.indexOf('constructor('));
  const classGuarded = /@UseGuards\(JwtAuthGuard\)/.test(beforeConstructor);

  const endpoints = [];

  // Split by HTTP method decorators
  const httpRe = /@(Get|Post|Patch|Delete|Put)\(['"`]?([^'"`)\s]*)['"`]?\)/g;
  let hm;
  while ((hm = httpRe.exec(src)) !== null) {
    const httpVerb = hm[1].toUpperCase();
    const routeParam = hm[2] || '';

    // Grab the block between this decorator position and the opening brace
    const blockStart = hm.index;
    const braceIdx = src.indexOf('{', blockStart);
    const block = src.slice(blockStart, braceIdx);

    // Find method name
    const methodM = block.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?$/m);
    const methodName = methodM ? methodM[1] : '';

    const isGuarded = classGuarded || /@UseGuards\(JwtAuthGuard\)/.test(block);
    const hasBody = /@Body\(\)/.test(block);
    const httpCodeM = block.match(/@HttpCode\((\d+)\)/);
    const successCode = httpCodeM
      ? parseInt(httpCodeM[1])
      : httpVerb === 'POST' ? 201 : httpVerb === 'DELETE' ? 204 : 200;

    const route = ('/' + prefix + (routeParam ? '/' + routeParam : '')).replace(/\/+/g, '/');

    endpoints.push({ method: httpVerb, route, auth: isGuarded, hasBody, successCode, methodName });
  }

  return { name: classMatch[1], prefix, endpoints };
}

// ── curl builder ──────────────────────────────────────────────────────────────

const EXAMPLE_BODIES = {
  'POST /profiles': JSON.stringify({ alias: 'miguelangel', phone: '+56912345678' }, null, 2),
  'PATCH /profiles/:id': JSON.stringify({ alias: 'nuevo_alias', phone: '+56987654321', bloodType: 'O+', allergies: ['Penicilina'], emergencyContactName: 'María González', emergencyContactPhone: '+56911111111', emergencyContactRelationship: 'Madre' }, null, 2),
};

function buildCurl(ep) {
  const url = `${BASE_URL}${ep.route}`.replace(':id', '<uuid>').replace(':alias', '<alias>');
  const lines = [`curl -X ${ep.method} '${url}'`];
  if (ep.auth) lines.push(`  -H 'Authorization: Bearer <TOKEN>'`);
  if (ep.hasBody) {
    lines.push(`  -H 'Content-Type: application/json'`);
    const key = `${ep.method} ${ep.route}`;
    const body = EXAMPLE_BODIES[key] ?? '{}';
    lines.push(`  -d '${body}'`);
  }
  return lines.join(' \\\n');
}

// ── markdown builder ──────────────────────────────────────────────────────────

function buildMarkdown(entities, controllers) {
  const now = new Date().toISOString().slice(0, 10);
  const lines = [];

  lines.push(`# API Reference — RocketID`);
  lines.push(`> Generado automáticamente · ${now}`);
  lines.push('');
  lines.push(`## Base URL`);
  lines.push('');
  lines.push(`\`\`\`\n${BASE_URL}\n\`\`\``);
  lines.push('');
  lines.push(`## Autenticación`);
  lines.push('');
  lines.push('Los endpoints marcados con 🔒 requieren JWT en el header:');
  lines.push('```');
  lines.push('Authorization: Bearer <TOKEN>');
  lines.push('```');
  lines.push('');

  // ── Endpoints ──
  lines.push('---');
  lines.push('## Endpoints');
  lines.push('');

  for (const ctrl of controllers) {
    if (!ctrl.endpoints.length) continue;
    lines.push(`### ${ctrl.name.replace('Controller', '')}`);
    lines.push('');
    lines.push('| Método | Ruta | Auth | Código |');
    lines.push('|--------|------|:----:|:------:|');
    for (const ep of ctrl.endpoints) {
      const lock = ep.auth ? '🔒' : '—';
      lines.push(`| \`${ep.method}\` | \`${ep.route}\` | ${lock} | ${ep.successCode} |`);
    }
    lines.push('');

    for (const ep of ctrl.endpoints) {
      lines.push(`#### ${ep.method} \`${ep.route}\``);
      if (ep.auth) lines.push('> 🔒 Requiere JWT');
      lines.push('');
      lines.push('```bash');
      lines.push(buildCurl(ep));
      lines.push('```');
      lines.push('');
    }
  }

  // ── Entities ──
  lines.push('---');
  lines.push('## Entidades');
  lines.push('');

  for (const ent of entities) {
    lines.push(`### ${ent.name}`);
    lines.push(`**Tabla:** \`${ent.table}\``);
    lines.push('');
    lines.push('| Columna | Tipo | Restricciones |');
    lines.push('|---------|------|---------------|');
    for (const col of ent.columns) {
      lines.push(`| \`${col.name}\` | \`${col.type}\` | ${col.constraints} |`);
    }
    lines.push('');
  }

  // ── Relations ──
  lines.push('---');
  lines.push('## Relaciones');
  lines.push('');
  lines.push('| Entidad | Relación | Target | FK/Propietario |');
  lines.push('|---------|----------|--------|----------------|');

  for (const ent of entities) {
    for (const rel of ent.relations) {
      const arrow =
        rel.type === 'OneToOne' ? '1 ↔ 1' :
        rel.type === 'OneToMany' ? '1 → N' :
        rel.type === 'ManyToOne' ? 'N → 1' : 'N ↔ N';
      const owner = rel.owning ? '✅ FK aquí' : '—';
      lines.push(`| \`${ent.name}\` | ${rel.type} (${arrow}) | \`${rel.target}\` | ${owner} |`);
    }
  }

  lines.push('');

  // ── Migration hints ──
  lines.push('---');
  lines.push('## Notas para migraciones / nuevas entidades');
  lines.push('');
  lines.push('- Al agregar una columna NOT NULL a una tabla con datos existentes, proveer un DEFAULT en la migración.');
  lines.push('- `simple-array` en TypeORM serializa como CSV en varchar — no usar comas en los valores.');
  lines.push('- Para renombrar columnas, generar migración manual con `ALTER TABLE … RENAME COLUMN`.');
  lines.push('- Relaciones `OneToOne` con `@JoinColumn` colocan la FK en la entidad propietaria.');
  lines.push('');

  return lines.join('\n');
}

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
  const entityFiles = findFiles(SRC, (n) => n.endsWith('.entity.ts'));
  const controllerFiles = findFiles(SRC, (n) => n.endsWith('.controller.ts') && !n.includes('dev-auth'));

  const entities = entityFiles.map(parseEntity).filter(Boolean);
  const controllers = controllerFiles.map(parseController).filter(Boolean);

  const md = buildMarkdown(entities, controllers);
  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`references_api.md actualizado (${entities.length} entidades, ${controllers.flatMap((c) => c.endpoints).length} endpoints)`);
}

main();
