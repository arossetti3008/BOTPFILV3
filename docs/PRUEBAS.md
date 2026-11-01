# Pruebas — BOTPFILV3

Cada fila distingue qué está **implementado**, cómo fue **probado** y qué queda **pendiente**. "Test automático" significa `npm test` en `backend/` con Gemini simulado (no llama a Google).

## Etapa 1 — Backend base (01/11/2026)

`npm test`: **38 tests, 38 pasan** (Node 22.21, Windows 11).

| Funcionalidad | Implementado | Probado (cómo) | Pendiente |
|---|---|---|---|
| `GET /api/health` (estado, modelo, respaldo, cuota, problemas; sin la clave) | Sí | Test automático | Datos de bibliografía (Etapa 2) |
| Arranque sin `LLM_API_KEY`: health y chat lo informan | Sí | Test automático | — |
| `GET /api/config-taller` | Sí | Test automático | — |
| `POST /api/chat`: validaciones (comisión, grupo coherente con la comisión, corpus, mensajes, último del grupo) | Sí | Test automático (9 casos inválidos → 400) | — |
| Mensaje de 2001 caracteres → 400; 2000 → 200 | Sí | Test automático | — |
| Mensaje 7 en un minuto del mismo grupo → 429 en español; otro grupo y otra comisión siguen funcionando | Sí | Test automático | — |
| Tope diario por grupo (`MAX_MENSAJES_SESION`) | Sí | Test automático | — |
| Pedidos inválidos no consumen el límite del grupo | Sí | Test automático | — |
| Recorte del historial a `MAX_MENSAJES_HISTORIAL` | Sí | Test automático | — |
| Guardia global por minuto (`GEMINI_RPM_MAX`): 429 sin llamar a Gemini, con `Retry-After` | Sí | Test automático | — |
| Guardia diaria por modelo (`GEMINI_RPD_MAX`), reinicio a medianoche del Pacífico | Sí | Test automático (con reloj simulado) | — |
| Fases 1 → 2 → 3 calculadas en el backend; comparación e imágenes rechazadas antes de tiempo | Sí | Test automático | Uso de la fase en el prompt definitivo (Etapa 3); fuentes solo desde la fase 2 (Etapa 2) |
| `geminiService`: une todas las partes de texto, descarta razonamiento, `generationConfig`, `thinkingConfig` opcional | Sí | Test automático | — |
| Reintentos 429/503 con espera creciente y respeto de `Retry-After` | Sí | Test automático | — |
| Respaldo automático (cuota diaria agotada, saturación, modelo inexistente, demora) | Sí | Test automático | Probar el respaldo real con cuota agotada (no se puede forzar sin gastar la cuota) |
| Presupuesto total de 50 s por mensaje (el navegador corta a 60 s) | Sí | Test automático | — |
| Bloqueos de seguridad (`blockReason`, `finishReason`) → 422 comprensible | Sí | Test automático | — |
| Logs sin contenido de mensajes | Sí | Test automático (falla de red) + revisión del log de la prueba real | — |
| CORS con `FRONTEND_URL` (nunca `*`) | Sí | Test automático | — |
| **Llamada real a Gemini** | Sí | Manual: servidor local + `curl` a `/api/chat` con la clave del usuario. `gemini-3.5-flash-lite` respondió 200 en ~2,3 s, con nivel de razonamiento vacío y con `low` (el campo `thinkingConfig.thinkingLevel` es aceptado) | — |
| Modelo de respaldo real (`gemini-3.1-flash-lite`) | Configurado | Manual: existe (no dio 404), pero en ese momento Google respondió 503 "high demand" y luego no respondió en 40 s | Volver a probarlo; confirmar su cuota gratuita en AI Studio |

### Observaciones de la prueba real

- **Red con inspección TLS:** en la PC de desarrollo, Node rechazó el certificado (`SELF_SIGNED_CERT_IN_CHAIN`). Se resolvió con `NODE_OPTIONS=--use-system-ca`, que usa los certificados de Windows sin desactivar la verificación. No afecta a Render.
- **Tono del tutor (prompt provisional):** usó "chiques", "Contadme" (forma de España) y "conténtenme" (error). Se corrige en el prompt definitivo de la Etapa 3.

## Etapa 2 — Bibliografía desde Drive (01/11/2026)

`npm test`: **55 tests, 55 pasan**. Los de esta etapa usan un Drive simulado (verifica la firma del token con la clave pública, como Google) y PDFs generados localmente con texto sintético; la extracción de texto es real (`unpdf`).

| Funcionalidad | Implementado | Probado (cómo) | Pendiente |
|---|---|---|---|
| Autenticación con cuenta de servicio (JWT firmado con `node:crypto`) | Sí | Test automático (el Drive simulado rechaza firmas inválidas) | Con credenciales reales |
| Listado de la carpeta, descarga de PDF, exportación de Google Docs a PDF y de la hoja a CSV | Sí | Test automático | Con la carpeta real |
| Extracción de texto por página y aviso de página sin texto | Sí | Test automático (PDF de 3 páginas, la 3.ª vacía) | Con PDFs reales; si hay escaneados, decidir OCR con el usuario |
| Hoja `fuentes`: columnas exactas, fila sin archivo, archivo sin fila, datos faltantes, tipos no soportados | Sí | Test automático | — |
| Fragmentos de hasta 350 palabras, sin cruzar páginas | Sí | Test automático | — |
| Búsqueda BM25 (minúsculas, sin tildes, sin palabras vacías, plurales simples) con prioridad al corpus activo | Sí | Test automático: un término de la página 2 devuelve la página 2 (citada "p. 24" con `paginaInicial` 23) | Calidad de la búsqueda con la bibliografía real |
| Re-sincronización solo si cambió algún archivo; descarga solo lo modificado | Sí | Test automático | — |
| Si Drive falla, se conserva el último índice | Sí | Test automático | — |
| Credenciales inválidas: el servidor arranca y `/api/health` lo informa; el chat responde sin fuentes | Sí | Test automático | — |
| `POST /api/admin/sincronizar`: 401 sin token o con token incorrecto; reporte con el correcto | Sí | Test automático | — |
| `GET /api/bibliografia` | Sí | Test automático | — |
| Inyección de fuentes: nada en fase 1; desde la fase 2, `TOP_FRAGMENTOS` bloques `[FUENTE n]` en el turno del grupo y lista de fuentes en la respuesta | Sí | Test automático | Ver cómo cita Gemini real (Etapa 3) |
| Tiempo de indexación | Medido | Script local: PDF sintético de 100 páginas (28.396 palabras) → 636 ms y unos 23 MB de memoria; cada búsqueda tarda 0,16 ms | Medir con la carpeta real (suma la descarga desde Drive) |
| **Sincronización con la carpeta real** | — | No probado: todavía no hay cuenta de servicio ni carpeta | Pendiente hasta que el docente las cree (guía en `docs/GUIA_DOCENTE.md`) |

Dependencia nueva: `unpdf` 2.1.0. `npm audit` informa 2 avisos moderados en `nodemon` (solo desarrollo local, no se despliega).

## Fuentes oficiales consultadas (01/11/2026)

| Tema | URL | Dato usado |
|---|---|---|
| Modelos | https://ai.google.dev/gemini-api/docs/models | `gemini-3.5-flash-lite` y `gemini-3.8-flash` estables, entrada de imágenes |
| Deprecaciones | https://ai.google.dev/gemini-api/docs/deprecations | Sin fecha de apagado para 3.5 Flash-Lite; 3.1 Flash-Lite hasta el 07/05/2027 |
| Límites | https://ai.google.dev/gemini-api/docs/rate-limits | Límites por proyecto; cuota diaria se reinicia a medianoche del Pacífico; los valores solo se ven en AI Studio |
| Límites vistos en AI Studio (cuenta del usuario) | https://aistudio.google.com/rate-limit | 3.5 Flash-Lite: 15 RPM, 250K TPM, 500 RPD. 3.8 Flash: 5 RPM, 250K TPM, 20 RPD |
| Razonamiento | https://ai.google.dev/gemini-api/docs/thinking | 3.5 Flash-Lite razona en nivel "minimal" por defecto; los tokens de razonamiento cuentan en el tope de salida |
| Imágenes | https://ai.google.dev/gemini-api/docs/image-understanding | 258 tokens por bloque de 768×768; tope de 20 MB por pedido |
| Términos (uso de datos, edad) | https://ai.google.dev/gemini-api/terms | Plan gratuito: contenido usado para mejorar productos y revisión humana; uso solo por mayores de 18 |
| Precios | https://ai.google.dev/gemini-api/pricing | Plan gratuito disponible para Flash y Flash-Lite |
