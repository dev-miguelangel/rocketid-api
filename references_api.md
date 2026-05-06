# API Reference — RocketID
> Generado automáticamente · 2026-05-06

## Base URL

```
http://localhost:3000
```

## Autenticación

Los endpoints marcados con 🔒 requieren JWT en el header:
```
Authorization: Bearer <TOKEN>
```

---
## Endpoints

### App

| Método | Ruta | Auth | Código |
|--------|------|:----:|:------:|
| `GET` | `/` | — | 200 |

#### GET `/`

```bash
curl -X GET 'http://localhost:3000/'
```

### Auth

| Método | Ruta | Auth | Código |
|--------|------|:----:|:------:|
| `GET` | `/auth/google` | — | 200 |
| `GET` | `/auth/google/callback` | — | 200 |
| `GET` | `/auth/me` | 🔒 | 200 |
| `GET` | `/auth/logout` | — | 200 |

#### GET `/auth/google`

```bash
curl -X GET 'http://localhost:3000/auth/google'
```

#### GET `/auth/google/callback`

```bash
curl -X GET 'http://localhost:3000/auth/google/callback'
```

#### GET `/auth/me`
> 🔒 Requiere JWT

```bash
curl -X GET 'http://localhost:3000/auth/me' \
  -H 'Authorization: Bearer <TOKEN>'
```

#### GET `/auth/logout`

```bash
curl -X GET 'http://localhost:3000/auth/logout'
```

### Profiles

| Método | Ruta | Auth | Código |
|--------|------|:----:|:------:|
| `POST` | `/profiles` | 🔒 | 201 |
| `GET` | `/profiles` | 🔒 | 200 |
| `GET` | `/profiles/alias/:alias` | — | 200 |
| `GET` | `/profiles/:id` | 🔒 | 200 |
| `PATCH` | `/profiles/:id` | 🔒 | 200 |
| `DELETE` | `/profiles/:id` | 🔒 | 204 |

#### POST `/profiles`
> 🔒 Requiere JWT

```bash
curl -X POST 'http://localhost:3000/profiles' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
  "alias": "miguelangel",
  "phone": "+56912345678"
}'
```

#### GET `/profiles`
> 🔒 Requiere JWT

```bash
curl -X GET 'http://localhost:3000/profiles' \
  -H 'Authorization: Bearer <TOKEN>'
```

#### GET `/profiles/alias/:alias`

```bash
curl -X GET 'http://localhost:3000/profiles/alias/<alias>'
```

#### GET `/profiles/:id`
> 🔒 Requiere JWT

```bash
curl -X GET 'http://localhost:3000/profiles/<uuid>' \
  -H 'Authorization: Bearer <TOKEN>'
```

#### PATCH `/profiles/:id`
> 🔒 Requiere JWT

```bash
curl -X PATCH 'http://localhost:3000/profiles/<uuid>' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
  "alias": "nuevo_alias",
  "phone": "+56987654321",
  "bloodType": "O+",
  "allergies": [
    "Penicilina"
  ],
  "emergencyContactName": "María González",
  "emergencyContactPhone": "+56911111111",
  "emergencyContactRelationship": "Madre"
}'
```

#### DELETE `/profiles/:id`
> 🔒 Requiere JWT

```bash
curl -X DELETE 'http://localhost:3000/profiles/<uuid>' \
  -H 'Authorization: Bearer <TOKEN>'
```

---
## Entidades

### Profile
**Tabla:** `profiles`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `uuid` | PK AUTO |
| `userId` | `string` | NOT NULL |
| `phone` | `varchar` | nullable |
| `alias` | `string` | UNIQUE, NOT NULL |
| `stringId` | `string` | UNIQUE, NOT NULL, len:6 |
| `bloodType` | `enum(BloodType)` | nullable |
| `allergies` | `simple-array` | nullable |
| `conditions` | `text` | nullable |
| `medications` | `simple-array` | nullable |
| `emergencyContactName` | `varchar` | nullable |
| `emergencyContactPhone` | `varchar` | nullable |
| `emergencyContactRelationship` | `varchar` | nullable |
| `createdAt` | `timestamp` | auto |
| `updatedAt` | `timestamp` | auto |

### User
**Tabla:** `users`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `uuid` | PK AUTO |
| `googleId` | `string` | UNIQUE, NOT NULL |
| `email` | `string` | UNIQUE, NOT NULL |
| `name` | `string` | NOT NULL |
| `avatar` | `varchar` | nullable |
| `role` | `enum(UserRole)` | NOT NULL |
| `status` | `enum(UserStatus)` | NOT NULL |
| `createdAt` | `timestamp` | auto |
| `updatedAt` | `timestamp` | auto |

---
## Relaciones

| Entidad | Relación | Target | FK/Propietario |
|---------|----------|--------|----------------|
| `Profile` | OneToOne (1 ↔ 1) | `User` | ✅ FK aquí |
| `User` | OneToOne (1 ↔ 1) | `Profile` | — |

---
## Notas para migraciones / nuevas entidades

- Al agregar una columna NOT NULL a una tabla con datos existentes, proveer un DEFAULT en la migración.
- `simple-array` en TypeORM serializa como CSV en varchar — no usar comas en los valores.
- Para renombrar columnas, generar migración manual con `ALTER TABLE … RENAME COLUMN`.
- Relaciones `OneToOne` con `@JoinColumn` colocan la FK en la entidad propietaria.
