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

### Flujo completo

```
Usuario escribe en Telegram
        ↓
Telegram hace POST a /api/telegram
        ↓
Endpoint extrae el texto y valida el secret
        ↓
Gemini Flash clasifica → { category, target_date, importance, content }
        ↓
Se guarda en SQLite con source: "TELEGRAM"
        ↓
Se responde al usuario en Telegram con confirmación
```

### Credenciales necesarias

**Bot de Telegram**
1. Hablar con `@BotFather` en Telegram
2. Enviar `/newbot` y seguir los pasos
3. Copiar el token que devuelve → `TELEGRAM_BOT_TOKEN`

**Gemini API Key**
1. Ir a [aistudio.google.com](https://aistudio.google.com)
2. Iniciar sesión con Google → `Get API Key` → `Create API key`
3. Copiar la key → `GEMINI_API_KEY`

**Webhook secret**
```bash
openssl rand -hex 32   # → TELEGRAM_WEBHOOK_SECRET
```

### Variables de entorno a agregar al `.env`

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
GEMINI_API_KEY=
```

### Dependencia a instalar

```bash
npm install @google/generative-ai
```

### Archivos a crear

**`src/lib/gemini.ts`** — clasificación con IA

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CLASSIFICATION_PROMPT = `
Sos un sistema de clasificación de memoria personal.
Analizá el siguiente mensaje y devolvé ÚNICAMENTE un JSON con esta estructura, sin markdown ni texto extra:

{
  "category": "SHORT" | "MEDIUM" | "LONG",
  "content": "texto limpio y conciso de la memoria",
  "target_date": "ISO 8601 string o null",
  "importance": "LOW" | "MEDIUM" | "HIGH"
}

Reglas:
- SHORT: tareas inmediatas, recordatorios de hoy o mañana, cosas efímeras (24-72hs)
- MEDIUM: eventos con fecha concreta en los próximos ~15 días (turnos, vencimientos, eventos)
- LONG: información persistente, objetivos, datos personales, sin fecha de expiración

Para MEDIUM, inferí la target_date a partir de hoy: {TODAY}.
Si el mensaje dice "en 5 días", calculá la fecha exacta.
Si no hay fecha clara, devolvé target_date: null.

Mensaje:
`;

export interface ClassificationResult {
  category: 'SHORT' | 'MEDIUM' | 'LONG';
  content: string;
  target_date: string | null;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function classifyMemory(text: string): Promise<ClassificationResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const today = new Date().toISOString().split('T')[0];
  const prompt = CLASSIFICATION_PROMPT.replace('{TODAY}', today) + text;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text().trim()) as ClassificationResult;
}
```

**`src/lib/telegram.ts`** — helper para responder mensajes

```typescript
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export function validateWebhookSecret(request: Request): boolean {
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  return secret === process.env.TELEGRAM_WEBHOOK_SECRET;
}
```

**`src/app/api/telegram/route.ts`** — webhook endpoint

```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { classifyMemory } from '@/lib/gemini';
import { sendMessage, validateWebhookSecret } from '@/lib/telegram';

const CATEGORY_LABELS: Record<string, string> = {
  SHORT: '🟢 RAM (corto plazo)',
  MEDIUM: '🟣 CACHE (mediano plazo)',
  LONG: '🔴 VAULT (largo plazo)',
};

export async function POST(request: Request) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const message = body?.message;

  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId: number = message.chat.id;
  const text: string = message.text;

  if (text.startsWith('/')) {
    await sendMessage(chatId, 'NeonCortex activo. Mandame cualquier cosa que quieras recordar y la clasifico automáticamente.');
    return NextResponse.json({ ok: true });
  }

  try {
    const classification = await classifyMemory(text);

    await prisma.memoryNode.create({
      data: {
        content: classification.content,
        level: classification.category,
        targetDate: classification.target_date ? new Date(classification.target_date) : null,
        importance: classification.importance,
        source: 'TELEGRAM',
      },
    });

    const label = CATEGORY_LABELS[classification.category];
    let confirmMsg = `✅ Guardado en ${label}\n"${classification.content}"`;

    if (classification.category === 'MEDIUM' && classification.target_date) {
      const diffDays = Math.ceil(
        (new Date(classification.target_date).getTime() - Date.now()) / 86400000
      );
      confirmMsg += `\nT - ${diffDays} días`;
    }

    await sendMessage(chatId, confirmMsg);
  } catch (error) {
    console.error('Error processing Telegram message:', error);
    await sendMessage(chatId, '❌ Error al procesar el mensaje. Intentá de nuevo.');
  }

  return NextResponse.json({ ok: true });
}
```

### Registrar el webhook con Telegram

Una vez que la app esté en una URL pública, correr **una sola vez**:

```bash
curl -X POST "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://TU-DOMINIO.com/api/telegram",
    "secret_token": "TU_WEBHOOK_SECRET"
  }'

# Verificar que quedó registrado:
curl "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

### Dev local con ngrok

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
# Copiar la URL HTTPS que da ngrok y usarla en el curl de arriba
# Cada vez que se reinicia ngrok hay que re-registrar el webhook
```

### Respuesta diaria proactiva (spaced repetition)

El bot envía un digest a las 9am con las memorias `nextReview <= hoy`.
Implementar con Vercel Cron Jobs una vez en producción.

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
- [ ] Obtener `TELEGRAM_BOT_TOKEN` desde @BotFather
- [ ] Obtener `GEMINI_API_KEY` desde aistudio.google.com
- [ ] Generar `TELEGRAM_WEBHOOK_SECRET` con openssl
- [ ] `npm install @google/generative-ai`
- [ ] Crear `src/lib/gemini.ts`
- [ ] Crear `src/lib/telegram.ts`
- [ ] Crear `src/app/api/telegram/route.ts`
- [ ] Levantar ngrok y registrar el webhook
- [ ] Testear enviando mensajes al bot

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
