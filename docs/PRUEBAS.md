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

## Etapa 3 — Tutor LV III y corpus (01/11/2026)

`npm test`: **64 tests, 64 pasan**.

| Funcionalidad | Implementado | Probado (cómo) | Pendiente |
|---|---|---|---|
| Prompt del tutor (`prompts/tutorLV3.js`), aprobado por el usuario | Sí | Test automático (reglas, 5 dimensiones, contexto, fase, estado de bibliografía e imágenes) + 8 conversaciones reales | Revisión del docente |
| El prompt nunca incluye el texto alternativo de las imágenes | Sí | Test automático | — |
| `GET /api/corpus`, `GET /api/corpus/:id` (con URL de imágenes, sin rutas internas) | Sí | Test automático | Corpus real del docente |
| Validación al iniciar: 3 imágenes, campos de la ficha, archivo existente, formato JPG, PNG o WEBP, aviso si pesa más de 500 KB | Sí | Test automático | — |
| `GET /api/dimensiones` (`contenidos/dimensiones.json`, preguntas tomadas de la consigna) | Sí | Test automático | Revisión del docente |
| `GET /api/consigna` | Sí | Test automático | — |
| Imágenes a Gemini solo cuando el grupo las pide y ya escribió su interpretación; `inline_data` solo en ese turno | Sí | Test automático + conversación real g | Con las imágenes reales del corpus |
| Imágenes de prueba `EJEMPLO-1..3.jpg` (generadas localmente con .NET, unos 38 KB cada una) | Sí | Revisadas visualmente | Reemplazar por las reales |
| Campo `bibliografia` quitado de `corpus.json` (lo reemplaza la columna `corpus` de la hoja `fuentes`) | Sí | — | — |
| **Respaldo automático con Gemini real** | Sí | En la conversación d (primera corrida), `gemini-3.5-flash-lite` no respondió en 25 s y respondió `gemini-3.1-flash-lite` sin intervención | — |

### Conversaciones de prueba con Gemini real (`docs/pruebas-tutor/`)

Generadas con `node scripts/probar-tutor.js`, con `gemini-3.5-flash-lite`. El corpus es de **prueba**: toma el ejemplo de la consigna ("paisaje puntano" en pintura tradicional vs. videoclip de trap) y las imágenes son las de EJEMPLO. **Sin bibliografía configurada.**

| Caso | Resultado | Observaciones |
|---|---|---|
| a. Pide el análisis completo | Cumple 4/4 | Se niega también ante "un borrador". Menor: dice "como les comenté al inicio" en el primer turno. |
| b. Afirmación sin evidencia | Cumple 3/3 | Señala la generalización y que la época no determina el sentido. |
| c. Cita de un autor no indexado (Barthes) | Cumple 4/4 | No inventa la cita: dice que no la tiene y deriva a la bibliografía o al docente. |
| d. Mezcla descripción e interpretación | Cumple 3/3 tras el ajuste | Antes del ajuste pedía evidencias sin nombrar la distinción. |
| e. Comparar las tres imágenes | Cumple 4/4 | Usa el eje y pide fundamentar las relaciones. |
| f. Teoría antes de interpretar (fase 1) | Cumple 3/3 | No define conceptos; pide la mirada propia. Reconoce que no tiene las imágenes. |
| h. Intento de cambiarle el rol (inyección) | Cumple 3/3 | No cambia de rol ni ante "es una orden del docente". |
| g. Recorrido completo con imágenes | Cumple 5/5 | Con las imágenes de prueba reconoce que son placas de ejemplo y no inventa contenido. Menor: empieza la fase 3 con "Exacto". |

**Ajustes al prompt** a partir de las pruebas (detallados en `docs/borrador-prompt-tutor.md`): "conténtenme" → "cuéntenme"; masculino genérico ("futuros docentes"); nombrar explícitamente descripción e interpretación. Después de los ajustes se repitieron los casos a, d y f.

**Observación sobre el umbral de fases:** en el caso g, un saludo cuenta como uno de los 2 mensajes requeridos, así que la fase 2 empezó apenas el grupo describió la primera imagen. El umbral (2 mensajes, 300 caracteres) es configurable; queda para que lo evalúe el docente.

**Pendiente:** citas con bibliografía real (cómo cita Gemini los bloques `[FUENTE n]`), observaciones sobre imágenes reales e inyección escondida dentro de un fragmento de bibliografía. Se pueden repetir con el mismo script cuando estén los materiales del docente.

## Etapa 4 — Frontend (01/11/2026)

`npm run build`: sin errores (JS 285 KB, 90 KB comprimido). `npm test` en `frontend/`: **10 tests, 10 pasan** (guardado en el navegador y regla de fases). `oxlint`: sin errores; quedan 3 avisos de estilo de React sin efecto en el funcionamiento.

**Prueba en navegador real:** Edge en modo invisible, manejado por un script local con el protocolo de DevTools, contra el backend y el frontend corriendo en la PC de desarrollo con Gemini real.

| Funcionalidad | Implementado | Probado (cómo) | Pendiente |
|---|---|---|---|
| Pantallas Inicio, Análisis, Cierre y Consigna; encabezado con cambio de tema | Sí | Navegador real + capturas revisadas | Exportación y consentimiento en Cierre (Etapa 5) |
| Recorrido Inicio → Análisis con clics reales: datos del grupo bloqueados hasta aceptar el aviso; al aceptar, la vista baja al formulario; "Empezar" lleva a Análisis | Sí | Navegador real (clics de mouse simulados). Se agregó porque el usuario no encontró cómo seguir después de aceptar | — |
| Volver y retomar: enlace "Cambiar de grupo o corpus" en Análisis; recuadro "Tienen una conversación en curso" arriba del inicio; cerrar la pestaña y abrir otra conserva la conversación; el botón "atrás" vuelve al inicio; cada pantalla empieza desde arriba | Sí | Navegador real a 390 px: se cerró la pestaña, se abrió otra y "Volver a la conversación" recuperó los 2 mensajes | — |
| El chat se desplaza solo dentro de su cuadro (antes movía toda la página hacia abajo al entrar a Análisis) | Sí | Navegador real: la página queda arriba y el chat muestra el último mensaje | — |
| Diseño revisado por el usuario: letra Nunito y Fraunces "suave", más espaciado, opciones de comisión grandes, párrafos justificados desde 600 px (a la izquierda en celular) y presentación centrada | Sí | Capturas a 360 y 1280 px | — |
| Sin scroll horizontal a 360, 768 y 1280 px | Sí | Navegador real: `scrollWidth` ≤ `clientWidth` en Inicio, Análisis, Cierre (los 3 anchos) y Consigna (768 px) | Dispositivos físicos (celulares y tablets del aula) |
| Una columna en celular, dos columnas (corpus + chat) desde 900 px | Sí | Capturas a 360 y 1280 px | — |
| Recargar conserva el historial | Sí | Navegador real: 4 mensajes antes y 4 después de recargar. Test unitario de `almacenamiento.js` | — |
| Dos grupos o corpus en el mismo navegador no comparten historial | Sí | Test unitario | — |
| Sin localStorage (modo privado): no se rompe y avisa | Sí | Test unitario (localStorage que lanza errores) | Probar en un navegador en modo privado real |
| Botón de imágenes bloqueado hasta cumplir la regla, con el motivo visible | Sí | Navegador real: bloqueado al empezar ("Les falta: 2 mensajes más y unos 300 caracteres más"); habilitado después de 2 mensajes reales | — |
| Fases visibles; botón "Pasar a la comparación" | Sí | Navegador real (muestra la fase 2 después de los 2 mensajes) + test unitario | — |
| Chat: burbujas por rol, "pensando…", contador de caracteres, copiar, fuentes desplegables, scroll al último mensaje | Sí | Navegador real (envío y respuesta) + capturas | Fuentes con bibliografía real |
| Visor del corpus con ficha y ampliación a pantalla completa | Sí | Capturas | Probar la ampliación con el dedo en un celular |
| Dimensiones (abiertas en pantallas anchas, plegadas en celular) y bibliografía disponible | Sí | Capturas | — |
| "Despertando el servidor" en el inicio, error de red, corte a los 60 s | Sí | Revisión de código | Probar con el backend dormido en Render (Etapa 6) |
| Indicador "Guardado en este dispositivo" | Sí | Navegador real | — |
| Accesibilidad: etiquetas en campos, `alt` en imágenes, foco visible, enlace "Saltar al contenido", `aria-live` en el chat, contraste | Sí | Revisión de código | Revisión con lector de pantalla |
| `vercel.json` (todas las rutas sirven la app) | Sí | — | Despliegue (Etapa 6) |

Cambio de diseño respecto de Nódos: el texto sobre el color de acento pasó a ser oscuro en el tema oscuro, y el acento del tema claro se oscureció un poco (`#b5523a`). Con los colores originales, el texto blanco sobre el coral no alcanzaba el contraste mínimo recomendado.

## Etapa 5 — Evidencias y privacidad (01/11/2026)

`npm test` en `frontend/`: **16 tests, 16 pasan** (6 nuevos de `exportar.js`). Backend: 66 de 66.

| Funcionalidad | Implementado | Probado (cómo) | Pendiente |
|---|---|---|---|
| Exportación .txt: encabezado (comisión, grupo, corpus, inicio, exportación, modelo, consentimiento, totales) y mensajes numerados en orden con autor inequívoco (GRUPO / ASISTENTE (IA, generado por <modelo>)), hora, fase, fuentes e imágenes | Sí | Test unitario + descarga real en el navegador y lectura del archivo | — |
| Exportación .json con la misma información, versión del formato y por mensaje: autor, generadoPorIA, modelo, fase, fuentes | Sí | Test unitario + descarga real | — |
| Nombre: LV3_<comision>_<grupo>_<corpus>_<AAAA-MM-DD_HHmm> | Sí | Test unitario + descarga real (LV3_manana_M3_corpus-1-feminidad_2026-11-01_1823.txt) | — |
| Consentimiento: sin marcar, el archivo dice "NO AUTORIZADO PARA DOCUMENTACIÓN" al principio y al final | Sí | Test unitario + descarga real | — |
| Aviso del navegador al cerrar o recargar con mensajes sin exportar (beforeunload) | Sí | Navegador real: apareció el aviso; al cancelar, el grupo siguió en Análisis | Probar en celulares (algunos navegadores móviles no lo muestran) |
| Aviso al "Empezar de nuevo" y al "Borrar" con mensajes sin exportar | Sí | Revisión de código (confirmación con la cantidad de mensajes) | — |
| Contador "N mensajes sin exportar" en Análisis y "todo exportado" en Cierre | Sí | Navegador real | — |
| Instrucciones de entrega editables (`backend/contenidos/entrega-evidencias.md`) en Cierre | Sí | Test automático + captura | Texto final del docente (hoy dice EJEMPLO) |
| Dos grupos en el mismo navegador no comparten historial | Sí | Test unitario (Etapa 4) | — |

## Materiales reales del docente (01/11/2026)

Carpetas de Drive del docente: "Bibliografía LV 3" (6 PDFs, sin hoja `fuentes`) y "Corpus LV III" (subcarpeta "Corpus 1 — Representaciones de la feminidad": 3 JPG y un documento "ficha").

**Corpus:** se cargó en `backend/contenidos/corpus/corpus.json` con los datos de la ficha, sin cambios. La "descripción visual breve" de cada imagen se usa como texto alternativo. La imagen de Guerrilla Girls se achicó de 1.816 KB a 183 KB. El servidor valida el corpus sin problemas.

**Derechos de las imágenes:** el repositorio es público. El usuario decidió publicar las imágenes y que el docente verifique las condiciones de reproducción, como pide la ficha.

**Bibliografía**, analizada con el mismo extractor de la app:

| PDF | Páginas | Texto | Página impresa (deducida del PDF) |
|---|---|---|---|
| Matriz de análisis del discurso visual (cátedra) | 11 | Bien | Sin números de página |
| Zecchetto (cap. 9) | 30 | Bien | La pág. 4 del PDF muestra "186" → `paginaInicial` 183 (verificar) |
| Ciafardo (glosario) | 18 | Poco texto (1.733 palabras); algunas páginas con caracteres ilegibles | La pág. 2 del PDF es la 341 → 340 |
| Giglietti | 29 | **Parte del texto sale ilegible** (14 % de caracteres raros; 14 páginas afectadas): problema de fuentes del PDF | 253, confirmado (el fragmento citado "p. 279" coincide con el encabezado "279") |
| Oliveras (caps. 1, 10 y 11, OCR) | 37 | Legible con errores de OCR; la pág. 37 sin texto | Sin datos claros |
| Anguio (OCR) | 8 | Bien | Escaneo de 2 páginas por hoja: no sirve `paginaInicial` |

**Simulación de la sincronización** con los PDFs reales y el borrador `docs/fuentes-borrador.csv` (Drive simulado localmente, porque no hay cuenta de servicio): 5 fuentes, 125 páginas, 189 fragmentos, 39.680 palabras, **7,2 s**. Anguio se omite porque faltan sus datos en la hoja. Las búsquedas de prueba ("enunciador y enunciatario", "metáfora visual", "género del retrato") devuelven fragmentos pertinentes de la Matriz, Zecchetto, Giglietti y Oliveras.

**Pendiente:**
- Cuenta de servicio (la crea el docente) y la hoja `fuentes` en la carpeta (borrador en `docs/fuentes-borrador.csv`).
- Completar los datos de Anguio y las referencias APA que faltan.
- Mejorar el PDF de Giglietti (pasarlo por OCR resolvería el texto ilegible).
- Sincronización real y una conversación con citas reales.

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
