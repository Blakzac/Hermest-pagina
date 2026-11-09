# HERMES · Centro de Mando

Interfaz conversacional en tiempo real para hablar directamente con **Hermes Agent** por texto o voz. El frontend está construido con React 19 + Vite + Tailwind CSS v4 y el backend con Express + SSE.

## Inicio rápido

```bash
npm install --legacy-peer-deps --include=optional
cp .env.example .env
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Conectar Hermes Agent

El servidor elige el transporte en este orden:

1. `HERMES_AGENT_URL` → endpoint HTTP/SSE.
2. `HERMES_AGENT_COMMAND` → proceso/CLI local.
3. `GEMINI_API_KEY` → fallback opcional con Gemini.
4. Modo local de demostración.

### Opción A · Endpoint HTTP/SSE

```env
HERMES_AGENT_URL="http://127.0.0.1:8787/chat"
HERMES_AGENT_API_KEY="opcional"
```

El servidor envía un `POST` con este cuerpo:

```json
{
  "message": "texto del operador",
  "history": [{ "role": "user", "content": "..." }],
  "sessionId": "uuid",
  "inputMode": "text | voice",
  "source": "hermes-command-center"
}
```

La respuesta puede ser:

- `text/event-stream` con eventos SSE (`data: {...}` o `data: texto`).
- `application/json` con campos como `response`, `reply`, `content`, `text`, `output`, `message` o formato OpenAI (`choices[0].message.content`).
- `text/plain` en streaming.

### Opción B · Proceso/CLI local

```env
HERMES_AGENT_COMMAND="hermes agent --stream"
```

El mensaje se envía por `stdin` y también está disponible en:

- `HERMES_MESSAGE`
- `HERMES_SESSION_ID`
- `HERMES_INPUT_MODE`

El `stdout` se transmite al navegador en tiempo real. `HERMES_AGENT_TIMEOUT_MS` controla el tiempo máximo (por defecto `120000`).

## API del centro de mando

- `GET /api/health` → estado del servidor y transporte activo.
- `POST /api/hermes/stream` → conversación con streaming SSE.

Eventos SSE enviados al frontend:

- `meta` → sesión, transporte y modo de entrada.
- `chunk` → fragmento de texto de Hermes Agent.
- `warning` → incidencia no fatal (se intenta el siguiente transporte).
- `done` → fin de la transmisión.
- `error` → error fatal del enlace.

## Voz

El micrófono usa la **Web Speech API** del navegador para convertir voz a texto. El mensaje se envía al servidor con `inputMode: "voice"`. No se requieren dependencias adicionales ni un servicio de transcripción externo.

## Scripts

```bash
npm run dev      # servidor Express + Vite
npm run build    # build de producción
npm run start    # servidor en producción
npm run lint     # TypeScript
```

## Interfaz

- Área de chat/HUD a pantalla completa.
- Modo HUD táctico con `Ctrl+J`.
- Respuestas renderizadas en el chat y en el panel de transmisión del HUD.
- Control de voz sintética, copiado de respuestas y limpieza de sesión.
- Sin widgets de flota ni iDempiere.
