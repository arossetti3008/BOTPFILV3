# BOTPFILV3 — Asistente de análisis discursivo visual

Aplicación web para los talleres de **Lenguaje Visual III** (Profesorado de Artes Visuales, IFDC Villa Mercedes). Proyecto Integrador de la Diplomatura en IA y Educación (Universidad Austral).

Grupos de estudiantes analizan un corpus de tres imágenes con la metodología de la cátedra, acompañados por un asistente de IA (Gemini). El asistente **no hace el análisis**: pide una interpretación inicial, la revisa con la bibliografía de la cátedra y acompaña la comparación entre las tres imágenes. La conversación se exporta como evidencia, con cada mensaje marcado como escrito por el **grupo** o generado por la **IA**.

- **App:** https://botpfilv-3.vercel.app
- **Servidor:** https://botpfilv3-backend.onrender.com (estado en `/api/health`)

## Cómo funciona

```
Navegador (React, Vercel)            Servidor (Express, Render)                Google
Inicio → Análisis → Cierre   ──►     /api/chat: valida, limita y arma   ──►   Gemini (generateContent)
historial en el dispositivo          el pedido con:
exportación .txt / .json               · el prompt del tutor (fase 1, 2 o 3)
                                       · 4 fragmentos de bibliografía (desde la fase 2)
                                       · las 3 imágenes, solo si el grupo las pide
                                     Bibliografía: lee la carpeta de Drive  ◄──  Drive del docente
                                     al arrancar y cada 30 min (índice en memoria)
```

- **Sin base de datos ni cuentas de usuario.** El grupo se identifica con comisión, código (M1, T2…) y corpus. La conversación queda solo en el dispositivo hasta que se exporta o se borra.
- **Las tres fases las controla el servidor:** en la fase 1 el asistente no recibe bibliografía; la fase 2 empieza cuando el grupo escribió su interpretación; la fase 3 la pide el grupo.
- **El servidor no guarda el contenido de los mensajes.** Los registros tienen solo metadatos: grupo, corpus, fase, modelo, duración y resultado.

## Estructura

| Carpeta | Contenido |
|---|---|
| `backend/` | Servidor Express. `src/prompts/tutorLV3.js` es el único archivo con instrucciones pedagógicas. |
| `backend/contenidos/` | Lo que edita el docente: corpus e imágenes, aviso inicial (`taller.json`), dimensiones, consigna, instrucciones de entrega. |
| `frontend/` | App React + Vite. |
| `docs/` | Guía docente, instructivo de Drive, pruebas, conversaciones de prueba del tutor, borrador del prompt. |

## Ejecutar en una computadora

Requisitos: **Node.js 22 o superior** (https://nodejs.org) y una clave de Gemini (https://aistudio.google.com → API keys).

```bash
git clone https://github.com/arossetti3008/BOTPFILV3.git
cd BOTPFILV3

# Servidor
cd backend
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# Abrí backend/.env y completá LLM_API_KEY con tu clave de Gemini
npm run dev                 # queda en http://localhost:5000

# App (en otra terminal, desde la carpeta BOTPFILV3)
cd frontend
npm install
cp .env.example .env        # en Windows: copy .env.example .env
npm run dev                 # abrí http://localhost:5173
```

- Sin bibliografía configurada, la app funciona igual y el asistente avisa que no puede citar. Para activarla, ver [docs/CUENTA_DE_SERVICIO.md](docs/CUENTA_DE_SERVICIO.md) (administración) y [docs/INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md](docs/INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md) (docente).
- **Redes con inspección de certificados** (algunas redes institucionales): si el servidor muestra `SELF_SIGNED_CERT_IN_CHAIN`, arrancalo con `NODE_OPTIONS=--use-system-ca` (PowerShell: `$env:NODE_OPTIONS="--use-system-ca"; npm run dev`).

### Pruebas

```bash
cd backend && npm test      # 71 tests, con Gemini y Drive simulados
cd frontend && npm test     # 16 tests (guardado, fases, exportación)
cd frontend && npm run build
```

Conversaciones de prueba con Gemini real (gastan unos 20 pedidos de la cuota): `cd backend && node scripts/probar-tutor.js`. El resultado queda en `docs/pruebas-tutor/`.

## Despliegue

Servidor en **Render** (`render.yaml`) y app en **Vercel** (carpeta `frontend`). Cada cambio subido a la rama `main` se publica solo. El paso a paso está en [DEPLOYMENT.md](DEPLOYMENT.md).

## Cuota de Gemini (plan gratuito) y plan B

Límites del plan gratuito vistos en AI Studio el 01/11/2026 para `gemini-3.5-flash-lite`: **15 pedidos por minuto y 500 por día**, por proyecto. La cuota diaria se reinicia a medianoche del Pacífico, alrededor de las **05:00 de Argentina**. Con una comisión por día (unos 5 grupos, 3 horas) se estiman entre 225 y 480 pedidos.

La app se cuida sola:
- Frena antes del límite: 12 pedidos por minuto y 450 por día (`GEMINI_RPM_MAX`, `GEMINI_RPD_MAX`).
- Cada grupo tiene un tope de 6 mensajes por minuto y 70 por día.

**Si se agota la cuota durante el taller:**

1. **Automático:** si el modelo principal se queda sin cuota, está saturado o no responde, el servidor pasa solo al modelo de respaldo (`GEMINI_MODEL_RESPALDO=gemini-3.1-flash-lite`), que tiene su propia cuota.
2. **Si también se agota el respaldo:** en Render → Environment, cambiar `GEMINI_MODEL` por otro modelo con cuota gratuita disponible (ver la página de límites de AI Studio). Render se reinicia en uno o dos minutos.
3. **Último recurso (no gratuito):** activar la facturación en AI Studio con un tope de gasto bajo. Además, en el plan pago Google no usa los mensajes para mejorar sus productos.

Para que los grupos sigan sin la IA mientras tanto: la consigna, las dimensiones y la bibliografía siguen disponibles en la app, y lo ya conversado se puede exportar.

## Privacidad y uso responsable

- Plan gratuito de Gemini: según los términos vigentes, Google puede usar lo que se envía para mejorar sus productos y personas revisoras pueden leerlo, desvinculado de la cuenta. Google pide no enviar información personal o sensible. El aviso inicial de la app lo advierte y pide no escribir nombres ni datos personales.
- Los términos exigen que quienes usan la app tengan **18 años o más**.
- Las imágenes del corpus son obras con derechos de autor. El docente verifica las condiciones de reproducción, como indica su ficha.

## Mejoras opcionales (fuera de esta versión)

- Guardado automático de las exportaciones en una carpeta privada de Drive del docente. Requeriría un endpoint que reciba la exportación solo con consentimiento y una cuenta de servicio con permiso de escritura en esa carpeta.
- Marcar en la exportación los mensajes del grupo que copian casi textualmente una respuesta del asistente.
- OCR en el servidor para PDFs escaneados (hoy se hace fuera de la app).

## Fuentes oficiales consultadas (01/11/2026)

- Modelos: https://ai.google.dev/gemini-api/docs/models
- Límites: https://ai.google.dev/gemini-api/docs/rate-limits y https://aistudio.google.com/rate-limit
- Deprecaciones: https://ai.google.dev/gemini-api/docs/deprecations
- Términos de uso (datos, edad): https://ai.google.dev/gemini-api/terms
- Precios: https://ai.google.dev/gemini-api/pricing
- Razonamiento: https://ai.google.dev/gemini-api/docs/thinking
- Imágenes: https://ai.google.dev/gemini-api/docs/image-understanding

El detalle de lo probado y lo pendiente está en [docs/PRUEBAS.md](docs/PRUEBAS.md).
