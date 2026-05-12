# Directorio Red EPA

Directorio bilingüe (español/inglés) de investigadores en educación de América Latina.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** — base de datos Postgres, autenticación y RLS
- **next-intl** — internacionalización ES/EN
- Hosting recomendado: **Vercel** (free) + **Supabase** (free)

## Estado actual

✅ Implementado en esta primera fase:

- Búsqueda pública con filtros (nombre, país, ciudad, institución, tema, metodología, año PhD, h-index)
- Página de detalle de investigador con `mailto:`, LinkedIn, Google Scholar, ORCID, sitio web
- Formulario abierto de envío (queda en estado `pending`)
- Selector de idioma ES/EN con cookie persistente
- Esquema SQL con políticas RLS para los 3 roles

🚧 Pendiente para próximas fases:

- Autenticación por magic link (`/sign-in`)
- Edición del propio perfil del investigador
- Panel de administrador de institución (revisar pendientes, editar miembros)
- Panel de super administrador (gestionar instituciones y admins)

## Setup

### 1. Crear proyecto en Supabase

1. Crea cuenta gratis en [supabase.com](https://supabase.com).
2. Crea un nuevo proyecto.
3. Ve a **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecuta.
4. (Opcional) Ejecuta también [`supabase/seed.sql`](supabase/seed.sql) para tener datos de ejemplo.
5. Ve a **Project Settings → API** y copia el `Project URL` y la `anon public key`.

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar y correr

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Convertirte en super admin

Después de crear tu primera cuenta de Supabase Auth (cualquier correo), corre en el SQL Editor:

```sql
insert into super_admins (user_id)
select id from auth.users where email = 'tu-correo@ejemplo.com';
```

## Estructura

```
app/
  page.tsx                  Búsqueda pública (home)
  researcher/[id]/          Perfil de investigador
  submit/                   Formulario de envío abierto
  sign-in/                  (placeholder) Ingreso por magic link
  actions/set-locale.ts     Server action para cambiar idioma
components/
  header.tsx                Barra superior con nav + switcher
  language-switcher.tsx     Botones ES / EN
  search-filters.tsx        Sidebar de filtros (cliente)
  researcher-card.tsx       Tarjeta de investigador
  submit-form.tsx           Formulario de envío
i18n/
  config.ts                 Locales y cookie
  request.ts                next-intl: detecta locale de cookie/header
lib/
  queries.ts                Funciones de búsqueda y lectura
  methodologies.ts          Lista canónica bilingüe de metodologías
  supabase/
    server.ts               Cliente Supabase para Server Components
    browser.ts              Cliente Supabase para componentes cliente
    types.ts                Tipos del esquema
messages/
  es.json / en.json         Traducciones de UI
supabase/
  schema.sql                Tablas + RLS — ejecutar en Supabase
  seed.sql                  Datos de ejemplo (opcional)
```

## Roles del sistema

| Rol | Cómo se asigna | Qué puede hacer |
|---|---|---|
| **Visitante** | (anónimo) | Ver perfiles aprobados, buscar, mandar correo, enviar formulario |
| **Investigador** | Tener su correo en un perfil con `status = 'approved'` | Editar su propio perfil |
| **Admin de institución** | Fila en `institution_admins` | Editar/aprobar/borrar investigadores de su institución |
| **Super admin** | Fila en `super_admins` | Todo, incluido crear instituciones y nombrar admins |

Todo el control de acceso se aplica vía Row Level Security en Postgres — el frontend no puede saltarse las reglas.

## Despliegue

Para Vercel: conecta este repo y agrega las dos variables `NEXT_PUBLIC_*` en **Project Settings → Environment Variables**. El plan free de Vercel + el plan free de Supabase alcanza para los primeros miles de visitas/registros mensuales.
