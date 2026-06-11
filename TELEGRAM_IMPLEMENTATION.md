# Implementación: Bot de Telegram + Clasificación con Gemini

## Resumen del flujo

```
Usuario escribe en Telegram
        ↓
Telegram hace POST a /api/telegram
        ↓
Endpoint extrae el texto y valida el secret
        ↓
Gemini Flash clasifica el mensaje → { category, target_date, importance, content }
        ↓
Se guarda en SQLite con source: "TELEGRAM"
        ↓
Se responde al usuario en Telegram con confirmación
```

---

## 1. Dependencias a instalar

```bash
npm install @google/generative-ai
```

No hace falta SDK de Telegram — se usan fetch calls directas a la Bot API.

---

## 2. Variables de entorno

Agregar al `.env`:

```env
TELEGRAM_BOT_TOKEN=         # Token de @BotFather
TELEGRAM_WEBHOOK_SECRET=    # String random que vos elegís (ej: openssl rand -hex 32)
GEMINI_API_KEY=             # Desde aistudio.google.com
```

---

## 3. Obtener las credenciales

### Bot de Telegram
1. Hablar con `@BotFather` en Telegram
2. Enviar `/newbot` y seguir los pasos
3. Copiar el token que devuelve

### Gemini API Key
1. Ir a [aistudio.google.com](https://aistudio.google.com)
2. Iniciar sesión con Google
3. `Get API Key` → `Create API key`
4. Copiar la key

---

## 4. Archivos a crear

### `src/lib/gemini.ts` — Cliente y función de clasificación

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

Reglas de clasificación:
- SHORT: tareas inmediatas, recordatorios de hoy o mañana, cosas efímeras (24-72hs)
- MEDIUM: eventos con fecha concreta en los próximos ~15 días (turnos, vencimientos, eventos)
- LONG: información persistente, objetivos, datos personales importantes, no tiene fecha de expiración

Para MEDIUM, inferí la target_date a partir de la fecha de hoy: {TODAY}.
Si el mensaje dice "en 5 días", calculá la fecha exacta.
Si no hay fecha clara, devolvé target_date: null.

Mensaje a clasificar:
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
  const response = result.response.text().trim();
  
  return JSON.parse(response) as ClassificationResult;
}
```

---

### `src/lib/telegram.ts` — Helper para responder mensajes

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

---

### `src/app/api/telegram/route.ts` — Webhook endpoint

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
  // Validar que viene de Telegram
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const message = body?.message;

  // Ignorar mensajes sin texto (fotos, stickers, etc.)
  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId: number = message.chat.id;
  const text: string = message.text;

  // Ignorar comandos de Telegram (/start, /help, etc.)
  if (text.startsWith('/')) {
    await sendMessage(chatId, 'NeonCortex activo. Mandame cualquier cosa que quieras recordar y la clasifico automáticamente.');
    return NextResponse.json({ ok: true });
  }

  try {
    // Clasificar con Gemini
    const classification = await classifyMemory(text);

    // Guardar en DB
    await prisma.memoryNode.create({
      data: {
        content: classification.content,
        level: classification.category,
        targetDate: classification.target_date ? new Date(classification.target_date) : null,
        importance: classification.importance,
        source: 'TELEGRAM',
      },
    });

    // Construir respuesta
    const label = CATEGORY_LABELS[classification.category];
    let confirmMsg = `✅ Guardado en ${label}\n"${classification.content}"`;
    
    if (classification.category === 'MEDIUM' && classification.target_date) {
      const date = new Date(classification.target_date);
      const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);
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

---

## 5. Registrar el webhook con Telegram

Una vez que la app esté en una URL pública, correr este comando **una sola vez**:

```bash
curl -X POST "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://TU-DOMINIO.com/api/telegram",
    "secret_token": "TU_WEBHOOK_SECRET"
  }'
```

Para verificar que quedó registrado:
```bash
curl "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

---

## 6. Dev local con ngrok

Para testear antes de deployar:

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
```

Copiar la URL HTTPS que da ngrok (ej: `https://abc123.ngrok.io`) y registrarla como webhook (paso 5).

Cada vez que se reinicia ngrok cambia la URL → hay que re-registrar el webhook.

---

## 7. Deploy (para webhook permanente)

La opción más simple es **Vercel**:

```bash
npm install -g vercel
vercel
```

Agregar las variables de entorno en el dashboard de Vercel:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `GEMINI_API_KEY`
- `DATABASE_URL`

> ⚠️ Vercel usa serverless functions — SQLite **no funciona** en producción en Vercel porque el filesystem es efímero.  
> Para prod se necesita migrar a **PostgreSQL** (Neon o Supabase tienen tier gratuito) y cambiar el provider en `prisma/schema.prisma`.

---

## 8. Migración de SQLite a PostgreSQL (solo para prod)

En `prisma/schema.prisma`, cambiar:

```prisma
datasource db {
  provider = "postgresql"   // antes: "sqlite"
  url      = env("DATABASE_URL")
}
```

Y en `.env` (o variables de Vercel):
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

Luego:
```bash
npx prisma db push
```

En dev se puede seguir usando SQLite sin cambiar nada.

---

## Checklist de implementación

- [ ] Crear bot en @BotFather → obtener `TELEGRAM_BOT_TOKEN`
- [ ] Obtener `GEMINI_API_KEY` desde aistudio.google.com
- [ ] Generar `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`)
- [ ] Agregar las 3 vars al `.env`
- [ ] `npm install @google/generative-ai`
- [ ] Crear `src/lib/gemini.ts`
- [ ] Crear `src/lib/telegram.ts`
- [ ] Crear `src/app/api/telegram/route.ts`
- [ ] Levantar ngrok y registrar el webhook
- [ ] Testear enviando mensajes al bot
- [ ] (Opcional) Deploy a Railway con PostgreSQL para URL permanente
