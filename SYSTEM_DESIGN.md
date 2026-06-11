# NeonCortex — Diseño del Sistema

Documento de referencia con todas las decisiones de diseño y features pendientes de implementar.

---

## 1. Filosofía del sistema

NeonCortex está inspirado en cómo funciona la **memoria biológica humana**, no en cómo funciona una computadora.

Principios clave:

- **Nada se borra** — las memorias se consolidan, se archivan o permanecen pendientes. El borrado es siempre una acción explícita e intencional del usuario.
- **El sistema es activo** — no esperás acordarte de algo, el sistema te lo trae en el momento correcto.
- **Todo persiste** — las cosas completadas no desaparecen, se convierten en memoria histórica consultable.

---

## 2. Ciclo de vida de las memorias

### RAM (SHORT) — Corto plazo

```
RAM ACTIVE
    │
    ├─ Usuario la marca como COMPLETADA
    │       → level: LONG + status: ARCHIVED
    │       → desaparece del dashboard principal
    │       → queda en el archivo oculto del VAULT
    │
    └─ No se completa, envejece
            → se queda visible como PENDIENTE
            → a partir de las 72hs sin completar,
              recibe un tinte visual de "envejecimiento"
              (borde tenue, color desaturado)
            → nunca se auto-archiva sola
```

### CACHE (MEDIUM) — Mediano plazo

```
CACHE ACTIVE
    │
    ├─ target_date no llegó
    │       → se muestra en el timeline con cuenta regresiva
    │
    └─ target_date pasó (cron job o lazy check)
            → level: LONG + status: ARCHIVED
            → queda como registro histórico con fecha
              ej: "Turno médico con oculista — 15 Jun 2026 ✓"
```

### VAULT (LONG) — Largo plazo

```
VAULT ACTIVE
    → siempre visible en el dashboard
    → requiere confirmación manual para editar
    → nunca expira automáticamente

VAULT ARCHIVED
    → oculto del dashboard por defecto
    → accesible vía botón al pie del panel
      "[ MEMORIA HISTÓRICA: N registros ]"
    → incluye todo lo consolidado desde RAM y CACHE
```

### Resumen visual del flujo

```
RAM ──(completada)──────────────────────────→ VAULT ARCHIVED (oculto)
RAM ──(sin completar, +72hs)──────────────→ se queda, cambia visual
CACHE ──(target_date pasó)────────────────→ VAULT ARCHIVED (oculto)
CACHE ──(target_date pendiente)───────────→ se queda en timeline
VAULT ACTIVE ─────────────────────────────→ permanente, visible siempre
```

---

## 3. Sistema de fuerza y spaced repetition

Inspirado en la **curva del olvido de Ebbinghaus** y en el modelo de **spaced repetition** (Anki).

### Concepto

Cada memoria tiene una "fuerza" que decae con el tiempo. El sistema te la muestra justo antes de que la olvides. Confirmás que la recordás → el intervalo de revisión se duplica → la memoria se consolida.

### Campos a agregar al schema

```prisma
strength        Float    @default(100)   // 0-100, decae con el tiempo
nextReview      DateTime?                // cuándo mostrarla de nuevo
reviewInterval  Int      @default(1)     // días hasta próxima revisión
reviewCount     Int      @default(0)     // veces que fue reforzada
```

### Algoritmo de decay (simplificado)

```
strength_actual = 100 * e^(-decay_rate * días_desde_creación)

decay_rate según categoría:
  SHORT → 0.5  (decae rápido, es efímero)
  MEDIUM → 0.2 (decae moderado)
  LONG → 0.05  (decae muy lento, casi permanente)
```

### Flujo de revisión

```
Memoria nueva
  → strength: 100, nextReview: mañana, reviewInterval: 1 día

Usuario confirma que la recuerda
  → reviewInterval se duplica (1 → 2 → 4 → 8 → 16 → 30 días...)
  → strength se resetea a 100
  → nextReview = hoy + nuevo reviewInterval

Usuario no responde
  → strength sigue decayendo
  → se vuelve a mostrar más seguido
```

### Integración con Telegram

El bot manda un mensaje diario con las memorias `nextReview <= hoy`:

```
🧠 NEONCORTEX — Revisión diaria

¿Recordás esto?
1. "Llamar al contador este mes"
2. "Alergia severa a la penicilina"
3. "OKR 2026: aprender Rust"

Respondé con los números que recordás (ej: "1 3")
```

---

## 4. Búsqueda global

### Alcance

Busca en **todas las memorias** — activas, archivadas e históricas.

### Campos indexados

| Campo | Descripción |
|---|---|
| `content` | Texto principal de la memoria |
| `notes` | Descripción larga opcional |
| `tags` | Tags separadas por coma |
| `source` | `"WEB"` o `"TELEGRAM"` |
| `level` | `SHORT`, `MEDIUM`, `LONG` |
| `status` | `ACTIVE`, `ARCHIVED`, `COMPLETED` |

### Comportamiento

- Input con lupa en el **header**, siempre visible.
- Filtra en **tiempo real** sobre los datos ya cargados en cliente (sin llamada API extra para las memorias activas).
- Las memorias archivadas **sí requieren una llamada** al endpoint `GET /api/memories?include=archived` porque no se cargan por defecto en el dashboard.
- Resultados agrupados por categoría: RAM activas → CACHE → VAULT activo → Historial.
- Highlight del término buscado en el resultado.

### Endpoint a agregar

```
GET /api/memories?q=texto&include=archived&source=TELEGRAM
```

---

## 5. Bot de Telegram + Clasificación con Gemini

> Detalle técnico completo en `TELEGRAM_IMPLEMENTATION.md`

### Resumen del flujo

```
Mensaje en Telegram
  → POST /api/telegram
  → validar secret token
  → Gemini Flash clasifica → { category, target_date, importance, content }
  → guardar en DB con source: "TELEGRAM"
  → responder confirmación al usuario
```

### Respuesta diaria proactiva (spaced repetition)

El bot envía un digest a las 9am con las memorias `nextReview <= hoy`.
Implementar con un cron job o con Vercel Cron Jobs.

### Variables de entorno necesarias

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
GEMINI_API_KEY=
```

---

## 6. Autenticación

La app no tiene ninguna protección actualmente. Antes del deploy público es bloqueante.

### Stack propuesto

**NextAuth.js** con provider de Google. Un solo usuario (el dueño).

### Archivos a crear

```
src/app/api/auth/[...nextauth]/route.ts
src/middleware.ts   → protege todas las rutas excepto /api/telegram
```

### Variables de entorno

```env
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTHORIZED_EMAIL=tu@email.com   → rechaza cualquier otro login
```

---

## 7. Tags — UI pendiente

El campo `tags` ya existe en el schema pero la UI lo ignora completamente.

### Lo que falta

- Input de tags al crear/editar una memoria (chips removibles).
- Filtro por tag en el dashboard (click en un tag filtra todas las columnas).
- El endpoint de búsqueda ya los incluye (ver sección 4).

---

## 8. Responsividad mobile

El layout de 3 columnas se rompe en pantallas chicas. Importa especialmente porque el bot de Telegram es de uso móvil.

### Propuesta

- **Mobile** (< 768px): un panel a la vez, navegación por tabs en el footer (`RAM | CACHE | VAULT`).
- **Tablet** (768px–1024px): dos columnas, VAULT debajo.
- **Desktop** (> 1024px): layout actual de 3 columnas.

---

## 9. Base de datos en producción

SQLite funciona para desarrollo local pero **no funciona en Vercel** (filesystem efímero).

### Migración a PostgreSQL

En `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Proveedores gratuitos recomendados: **Neon** o **Supabase**.

En dev se puede seguir usando SQLite sin cambiar nada — Prisma maneja ambos.

---

## 10. Checklist general de implementación

### Ciclo de vida de memorias
- [ ] Al completar RAM → mutar a `level: LONG, status: ARCHIVED`
- [ ] Al vencer CACHE → mutar a `level: LONG, status: ARCHIVED` (cron o lazy check)
- [ ] Tinte visual de "envejecimiento" en RAM con +72hs sin completar
- [ ] Botón `[ MEMORIA HISTÓRICA ]` al pie del VAULT para expandir archivados

### Spaced repetition
- [ ] Agregar campos `strength`, `nextReview`, `reviewInterval`, `reviewCount` al schema
- [ ] Lógica de decay según categoría
- [ ] Endpoint `PATCH /api/memories/:id/review` para confirmar revisión
- [ ] Vista "Revisión pendiente" en el dashboard
- [ ] Mensaje diario proactivo del bot de Telegram

### Búsqueda
- [ ] Input de búsqueda en el header
- [ ] Filtro en tiempo real sobre memorias cargadas
- [ ] Endpoint `GET /api/memories?q=&include=archived`
- [ ] Resultados agrupados con highlight del término

### Telegram + Gemini
- [ ] Todo lo detallado en `TELEGRAM_IMPLEMENTATION.md`

### Auth
- [ ] NextAuth con Google
- [ ] Middleware que protege todas las rutas
- [ ] Whitelist de email autorizado

### Tags UI
- [ ] Input de tags al crear memoria
- [ ] Filtro por tag en dashboard

### Mobile
- [ ] Layout responsive con tabs en mobile

### Producción
- [ ] Migrar schema a PostgreSQL
- [ ] Configurar Neon o Supabase
- [ ] Deploy en Vercel o Railway
- [ ] Registrar webhook de Telegram con URL de producción
- [ ] Configurar Vercel Cron Jobs para el digest diario
