# Guía docente — BOTPFILV3

Todo lo que hace falta para preparar y usar la aplicación en los talleres. No hace falta saber programar. Donde hay que tocar algo técnico, se indica quién lo hace.

- **App para los grupos:** https://botpfilv-3.vercel.app
- **Estado del servidor:** https://botpfilv3-backend.onrender.com/api/health

---

## 1. Materiales que aporta el docente

| Material | Dónde va | Estado al 01/11/2026 |
|---|---|---|
| Carpeta principal con "Bibliografía" y una carpeta "Corpus …" por corpus | Drive del docente | ⏳ El docente la está armando ([instructivo](INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md)). |
| PDFs de la bibliografía, con texto seleccionable (pueden ir en subcarpetas) | Carpeta "Bibliografía" | ⏳ Giglietti tiene páginas ilegibles: conviene pasarlo por OCR. |
| Cada corpus: 3 fotos y el documento "Ficha" | Carpetas "Corpus …" | ⏳ La ficha del corpus 1 ya está escrita: [ficha-corpus-1.txt](ficha-corpus-1.txt). |
| Carpeta principal compartida con la cuenta de servicio | Drive | ⏳ Falta. |
| Datos de cada PDF (autor, año, título, referencia APA, página inicial) | `backend/contenidos/fuentes.csv` (los carga quien administra la app) | ⏳ Faltan los datos de Anguio y las referencias APA de Ciafardo, Giglietti y Oliveras. |
| Cuenta de servicio | Google Cloud (la crea quien administra la app) | ⏳ Falta ([guía](CUENTA_DE_SERVICIO.md)). |
| Corpus de respaldo (se usa si Drive falla) | `backend/contenidos/corpus/` | ✅ Corpus 1, "Representaciones de la feminidad". |
| Texto final del aviso de IA y privacidad | `backend/contenidos/taller.json` | ⏳ Borrador: el docente lo confirma (sección 4). |
| Instrucciones de entrega de evidencias | `backend/contenidos/entrega-evidencias.md` | ⏳ Dice "EJEMPLO": hay que completarlo (sección 4). |
| Clave de Gemini (plan gratuito) | Render, variable `LLM_API_KEY` | ✅ Cargada. |

---

## 2. Carpeta de materiales y bibliografía (Google Drive)

- **El docente:** arma la carpeta principal (con "Bibliografía" y las carpetas "Corpus") y la comparte con la cuenta de servicio → **[INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md](INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md)**.
- **Quien administra la app:** crea la cuenta de servicio, la carga en Render y mantiene los datos de cada PDF en `backend/contenidos/fuentes.csv` → **[CUENTA_DE_SERVICIO.md](CUENTA_DE_SERVICIO.md)**.

**Actualizar la bibliografía más adelante:** el docente sube el PDF a la carpeta y le pasa sus datos a quien administra la app, que agrega la fila en `fuentes.csv`. La carpeta se revisa sola cada 30 minutos. Si un PDF se reemplaza por otro con el mismo nombre, no hace falta tocar nada.

**Forzar la actualización al instante.** Lo hace quien administra la app:

1. En Render → `botpfilv3-backend` → **Environment**, copiá el valor de `ADMIN_TOKEN`.
2. En PowerShell (Windows):

```powershell
Invoke-RestMethod -Method Post -Uri "https://botpfilv3-backend.onrender.com/api/admin/sincronizar" -Headers @{ "x-admin-token" = "PEGAR_AQUI_EL_ADMIN_TOKEN" }
```

La respuesta es un reporte: cuántas fuentes, páginas y fragmentos indexó, y las advertencias (por ejemplo, "página sin texto" o "falta la fila en la hoja").

---

## 3. Cargar o cambiar un corpus

Los corpus se manejan **desde Drive**: cada carpeta "Corpus …" de la carpeta principal es un corpus, con **exactamente 3 fotos** y un documento de Google llamado **"Ficha"**. El formato de la ficha y el peso recomendado de las fotos están en el [instructivo](INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md#cada-carpeta-corpus).

- **Agregar un corpus:** crear otra carpeta "Corpus …" con sus 3 fotos y su ficha.
- **Corregir una ficha o cambiar una foto:** hacerlo en Drive.
- La app lo toma sola en hasta 30 minutos, o al instante forzando la sincronización (sección 2).
- **No cambiar el nombre de una carpeta durante el taller:** el nombre identifica al corpus, y los grupos que estaban trabajando con él no podrían seguir.

Si una carpeta tiene un error (por ejemplo, 2 fotos en lugar de 3, o a la ficha le falta la problemática), ese corpus no se ofrece. Si antes funcionaba, se sigue mostrando su última versión correcta. En los dos casos, `/api/health` → `corpus.advertencias` dice cuál es el problema.

Qué recibe el asistente: la problemática, el eje y la ficha de cada obra (título, autor, año, soporte, procedencia). **El texto alternativo no lo recibe**, así no "ve" la imagen sin que el grupo la describa. Las fotos las recibe solo cuando el grupo las pide, después de escribir su propia interpretación.

**Corpus de respaldo.** En `backend/contenidos/corpus/` (en GitHub) queda guardado el corpus 1. La app lo usa solo si Drive no está configurado, no responde o no tiene ningún corpus válido.

---

## 4. Textos que el docente puede editar

Todos están en `backend/contenidos/`, en GitHub. Para cambiarlos hay dos formas:
- Pedírselo a quien administra la app.
- Editarlos desde la web de GitHub: abrir el archivo → ícono del lápiz → **Commit changes**, en la rama `main`.

Render se actualiza solo en uno o dos minutos.

| Archivo | Qué contiene |
|---|---|
| `taller.json` | **Aviso de IA y privacidad** (la lista `puntos`), texto de la casilla "Leí y entiendo", comisiones y formato del código de grupo. |
| `entrega-evidencias.md` | Instrucciones de entrega que ven los grupos en la pantalla de cierre. Hoy dicen **EJEMPLO**. |
| `dimensiones.json` | Las 5 dimensiones, con descripción y preguntas guía tomadas de la consigna. |
| `consigna.md` | La consigna que se abre desde el inicio. |

**Sobre el aviso:** tiene que conservar el punto que dice que lo escrito se envía a Google y que, en el plan gratuito, puede usarse para mejorar sus productos y ser leído por revisores. Lo exigen los términos de Gemini y es lo que justifica pedir que no escriban datos personales.

**Códigos de grupo:** por defecto, M1 a M99 para la mañana y T1 a T99 para la tarde. Conviene repartirlos antes de empezar (M1, M2… en papel o en el pizarrón).

Las **instrucciones del asistente** (el "prompt") están en `backend/src/prompts/tutorLV3.js`. Si se cambian, conviene repetir las conversaciones de prueba (`docs/pruebas-tutor/`).

---

## 5. Lista de control para el día del taller

**El día anterior**
- [ ] Abrir `/api/health` y revisar:
  - `"estado": "ok"`;
  - `"corpusDisponibles": 1` o más;
  - `bibliografia.estado` en `"ok"`, con la cantidad de fuentes esperada;
  - `corpus.origen` en `"drive"` y `corpus.advertencias` vacío.
- [ ] Probar la app de punta a punta desde un celular: entrar con un código de prueba (por ejemplo **M99**), mandar dos mensajes, exportar y borrar.
- [ ] Repartir o anotar los códigos de grupo.
- [ ] Confirmar cómo entregan los archivos (sección 4, `entrega-evidencias.md`).

**10 minutos antes de empezar**
- [ ] **Abrir la app** (https://botpfilv-3.vercel.app). El servidor gratuito se "duerme" después de 15 minutos sin uso. Al despertar tarda hasta un minuto en responder y **unos 4 minutos más en volver a leer la bibliografía** (los corpus están en segundos). Si se abre antes, los grupos no esperan y el asistente ya puede citar cuando lleguen a la fase 2.

**Al empezar, decirle a los grupos**
- Leer el aviso y no escribir nombres ni datos personales.
- Usar **un solo dispositivo por grupo** y no usar ventanas privadas o de incógnito: la conversación se guarda en ese dispositivo.
- El asistente no hace el análisis: primero piden su interpretación, después la revisan con la bibliografía y al final comparan.
- **Exportar antes de irse** (botón "Terminar y exportar").

**Al terminar**
- [ ] Recibir los archivos exportados. El nombre identifica comisión, grupo, corpus, fecha y hora.
- [ ] Pedir que borren la conversación del dispositivo si es compartido (botón "Borrar conversación" en el cierre).

---

## 6. Problemas durante el taller

| Lo que ven los grupos | Qué pasa y qué hacer |
|---|---|
| "El servidor está despertando…" | Normal la primera vez: esperar hasta un minuto. |
| "El asistente está atendiendo a varios grupos, esperá unos segundos" | Se alcanzó el tope por minuto: reenviar en unos segundos. |
| "Están enviando mensajes muy rápido" | Ese grupo superó 6 mensajes por minuto: esperar un minuto. |
| "Se agotó la cuota diaria gratuita del asistente" | Se agotaron los 2 modelos (principal y respaldo). Ver "Plan B" en el [README](../README.md). Mientras tanto pueden seguir con la consigna, las dimensiones y la bibliografía, y exportar lo ya conversado. |
| "Este navegador no permite guardar…" | Están en una ventana privada: si recargan, se pierde la conversación. Exportar seguido o cambiar a una ventana normal. |
| "La clave de Gemini no es válida…" | Revisar `LLM_API_KEY` en Render (lo hace quien administra la app). |
| Un grupo cerró la pestaña | No se pierde nada: al volver a entrar con el mismo dispositivo aparece "Tienen una conversación en curso → Volver a la conversación". |
