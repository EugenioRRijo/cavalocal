# CavaLocal — Backend (NestJS + PostgreSQL + Prisma)

API REST del marketplace de vinos. Arquitectura por capas (Controller → Service →
Prisma) con criterio SOLID. **No** incluye la app móvil ni la landing.

## Estado
- ✅ Modelo de base de datos completo (`prisma/schema.prisma`).
- ✅ Autenticación: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (JWT).
- ✅ Catálogo: `GET /wines`, `GET /wines/:id` (con disponibilidad por establecimiento).
- ✅ `GET /health` y Swagger en `/docs`. Compila (`npm run build`).
- ✅ **PostgreSQL 16.4 instalado localmente (portátil)** en `C:\Users\euger\pgsql`, datos en `C:\Users\euger\pgdata`, base `cavalocal` migrada y poblada. El backend ya corre y responde.

## Arranque rápido (entorno ya configurado)
```powershell
# 1) Encender PostgreSQL (tras reiniciar la PC)
powershell -File start-postgres.ps1
# 2) Arrancar el backend
npm run start:dev
```
- API: http://localhost:3001 · Swagger: http://localhost:3001/docs · Health: http://localhost:3001/health
- Para detener Postgres: `powershell -File stop-postgres.ps1`

## 1) (Alternativa) Conseguir una base PostgreSQL desde cero
**Opción A — Nube gratis (recomendada, sin instalar nada):**
1. Creá una cuenta en https://neon.tech (o https://supabase.com).
2. Creá un proyecto → copiá la **connection string** (postgresql://...).
3. Pegala en `.env` como `DATABASE_URL`.

**Opción B — Docker local:** instalá Docker Desktop y corré:
```bash
docker run --name cavalocal-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cavalocal -p 5432:5432 -d postgres:16
```

**Opción C — PostgreSQL para Windows:** instalá desde https://www.postgresql.org/download/windows/
y creá una base `cavalocal`.

## 2) Configurar y arrancar
```bash
cd backend
cp .env.example .env          # poné tu DATABASE_URL y un JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init   # crea las tablas
npm run prisma:seed                  # carga datos de ejemplo (incl. ana@example.com / 1234)
npm run start:dev
```
- API: http://localhost:3001
- Swagger (probar endpoints): http://localhost:3001/docs
- Health: http://localhost:3001/health

## Conectar la app
En `app/.env` poné `EXPO_PUBLIC_API_BASE_URL=http://localhost:3001` y reemplazá el
mock de `app/src/auth/AuthContext.tsx` por llamadas a `POST /auth/login` y
`POST /auth/register`, y el catálogo (`app/src/data/selectors.ts`) por `GET /wines`.

## Estructura
- `prisma/schema.prisma` — modelo de datos (User, Establishment, Wine, Availability, Review, Order, …)
- `src/config` — configuración tipada + validación de `.env`
- `src/prisma` — PrismaService global
- `src/common` — filtro de errores, logging, guards (JWT/roles), decoradores
- `src/modules/{health,auth,catalog}` — módulos (controller/service)
