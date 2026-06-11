# ⬛ NEONCORTEX

> *A persistent second brain. Cyberpunk aesthetic. Three tiers of memory.*

```
███╗   ██╗███████╗ ██████╗ ███╗   ██╗ ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗
████╗  ██║██╔════╝██╔═══██╗████╗  ██║██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝
██╔██╗ ██║█████╗  ██║   ██║██╔██╗ ██║██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝ 
██║╚██╗██║██╔══╝  ██║   ██║██║╚██╗██║██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗ 
██║ ╚████║███████╗╚██████╔╝██║ ╚████║╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗
╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
```

---

## Qué es esto

NeonCortex es una app web de gestión de memoria personal. La idea es simple: tu cerebro trabaja con distintos tipos de memoria según el horizonte temporal. Esta app replica esa arquitectura.

Los datos se persisten en una base de datos SQLite local. Podés agregar información desde la interfaz web o (próximamente) desde un bot de Telegram con clasificación automática por IA.

---

## Los tres módulos de memoria

### 🟢 RAM — Corto Plazo
Tareas inmediatas, recordatorios efímeros. Expiran en 24–72 hs.  
Funciona como una lista de tareas clásica: tick y listo.

### 🟣 CACHE — Mediano Plazo
Eventos e hitos de los próximos ~15 días.  
Cada entrada muestra una cuenta regresiva: `T - 5 días`, `T - HOY`, `VENCIDO`.

### 🔴 VAULT — Largo Plazo
Información persistente que no cambia a menudo.  
OKRs personales, historial médico, valores. Requiere confirmación manual para editar.

---

## Terminal CLI

La app tiene una consola de comandos en el pie de página:

```
/ram <texto>                        → Asignar a RAM
/cache <días> <texto>               → Programar en Cache
/hdd <texto>                        → Sellar en el Vault
/promote "<búsqueda>" hdd           → Consolidar memoria → LONG
/promote "<búsqueda>" cache <días>  → Consolidar memoria → MEDIUM
/help                               → Ver comandos disponibles
/clear                              → Limpiar consola
```

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | SQLite vía Prisma ORM |
| Estilos | CSS Modules + Variables CSS globales |
| Audio | Web Audio API |

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/agustinf77/second.git
cd second

# 2. Instalar dependencias
npm install

# 3. Configurar la base de datos
echo 'DATABASE_URL="file:./prisma/dev.db"' > .env
npx prisma db push

# 4. Levantar el servidor de desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). La primera vez que cargue sin datos en la DB, se auto-sembrará con ejemplos.

---

## API

```
GET    /api/memories          → Todas las memorias
POST   /api/memories          → Crear memoria
PATCH  /api/memories/:id      → Actualizar (status, contenido, categoría, fecha)
DELETE /api/memories/:id      → Eliminar
```

El campo `category` en la API (`SHORT | MEDIUM | LONG`) mapea al campo `level` en la base de datos.

---

## Roadmap

- [ ] Bot de Telegram con clasificación automática por IA
- [ ] Webhook endpoint `/api/telegram`
- [ ] Tags y filtros
- [ ] Modo exportación (JSON / Markdown)
- [ ] Auth para uso multi-usuario

---

<div align="center">
  <sub>Built with 🖤 and too much caffeine</sub>
</div>
