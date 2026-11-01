# Guía docente — BOTPFILV3

Todo lo que hace falta para preparar y usar la aplicación en los talleres. No hace falta saber programar. Donde hay que tocar algo técnico, se indica quién lo hace.

- **App para los grupos:** https://botpfilv-3.vercel.app
- **Estado del servidor:** https://botpfilv3-backend.onrender.com/api/health

---

## 1. Materiales que aporta el docente

| Material | Dónde va | Estado al 01/11/2026 |
|---|---|---|
| PDFs de la bibliografía, con texto seleccionable | Carpeta de Drive "Bibliografía LV 3" | ✅ 6 PDFs. Giglietti tiene páginas ilegibles: conviene pasarlo por OCR. |
| Hoja `fuentes` con los datos de cada PDF | La misma carpeta | ⏳ Falta. Hay un borrador listo (instructivo, paso 3). |
| Cuenta de servicio y carpeta compartida con ella | Google Cloud y Drive | ⏳ Falta ([instructivo](INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md), pasos 1, 2 y 4). |
| Corpus: problemática, eje y 3 imágenes con su ficha | `backend/contenidos/corpus/` | ✅ Corpus 1, "Representaciones de la feminidad". |
| Texto final del aviso de IA y privacidad | `backend/contenidos/taller.json` | ⏳ Borrador: el docente lo confirma (sección 4). |
| Instrucciones de entrega de evidencias | `backend/contenidos/entrega-evidencias.md` | ⏳ Dice "EJEMPLO": hay que completarlo (sección 4). |
| Clave de Gemini (plan gratuito) | Render, variable `LLM_API_KEY` | ✅ Cargada. |

---

## 2. Bibliografía (Google Drive)

El paso a paso completo, pensado para quien no tiene experiencia técnica, está en **[INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md](INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md)**: cuenta de servicio, compartir la carpeta, hoja `fuentes`, envío seguro de la clave y PDFs escaneados.

**Actualizar la bibliografía más adelante:** subí el PDF a la carpeta, agregá su fila en la hoja `fuentes` y esperá hasta 30 minutos. No hace falta tocar código ni volver a publicar la app.

**Forzar la actualización al instante.** Lo hace quien administra la app:

1. En Render → `botpfilv3-backend` → **Environment**, copiá el valor de `ADMIN_TOKEN`.
2. En PowerShell (Windows):

```powershell
Invoke-RestMethod -Method Post -Uri "https://botpfilv3-backend.onrender.com/api/admin/sincronizar" -Headers @{ "x-admin-token" = "PEGAR_AQUI_EL_ADMIN_TOKEN" }
```

La respuesta es un reporte: cuántas fuentes, páginas y fragmentos indexó, y las advertencias (por ejemplo, "página sin texto" o "falta la fila en la hoja").

---

## 3. Cargar o cambiar un corpus

Cada corpus tiene **exactamente 3 imágenes**. Se guarda en dos lugares de `backend/contenidos/corpus/`:

- **`imagenes/`**: los archivos JPG, PNG o WEBP.
  - **Peso recomendado: menos de 500 KB y como máximo 1600 px de lado**, porque se ven desde celulares y viajan a Gemini.
  - La app avisa en `/api/health` si alguna pesa de más.
- **`corpus.json`**: los datos de cada corpus.

Ejemplo de un corpus dentro de `corpus.json`:

```json
{
  "id": "corpus-2-ejemplo",
  "titulo": "Corpus 2 — Título que ven los grupos",
  "problematica": "La problemática sociocultural del corpus.",
  "ejeComparabilidad": "Qué comparten las tres piezas y qué permite compararlas.",
  "imagenes": [
    {
      "id": "img1",
      "archivo": "01_nombre_del_archivo.jpg",
      "titulo": "Título de la obra",
      "autor": "Autor o autora",
      "anio": "1990",
      "soporte": "Afiche, fotografía, pintura…",
      "procedencia": "Museo o archivo, ciudad",
      "fuente": "https://dirección-de-la-ficha-de-la-obra",
      "textoAlternativo": "Descripción breve de la imagen para personas que usan lectores de pantalla."
    }
  ]
}
```

(En el archivo real van las 3 imágenes. Si hay más de un corpus, van uno después del otro, separados por coma, dentro de los corchetes `[ ]`.)

Cómo se usan algunos campos:

- **`id`**: sin espacios ni tildes. También va en la columna `corpus` de la hoja `fuentes`, para que esa bibliografía tenga prioridad.
- **`textoAlternativo`**: **el asistente no lo recibe**. Así no "ve" la imagen sin que el grupo la describa.
- **Ficha** (título, autor, año, soporte, procedencia): el asistente sí la recibe.

**Cómo publicar el cambio:** los archivos de `backend/contenidos/` están en GitHub. Hay dos formas:
- Pedírselo a quien administra la app.
- Editarlos desde la web de GitHub (abrir el archivo → ícono del lápiz → **Commit changes**, en la rama `main`). Para subir imágenes: carpeta `imagenes` → **Add file → Upload files**.

Render se actualiza solo en uno o dos minutos. Si el corpus tiene un error (por ejemplo, 2 imágenes en lugar de 3, o un archivo que no existe), no se ofrece a los grupos y `/api/health` dice cuál es el problema.

---

## 4. Textos que el docente puede editar

Todos están en `backend/contenidos/` y se publican igual que el corpus (sección 3).

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
  - `bibliografia.estado` en `"ok"`, con la cantidad de fuentes esperada.
- [ ] Probar la app de punta a punta desde un celular: entrar con un código de prueba (por ejemplo **M99**), mandar dos mensajes, exportar y borrar.
- [ ] Repartir o anotar los códigos de grupo.
- [ ] Confirmar cómo entregan los archivos (sección 4, `entrega-evidencias.md`).

**5 minutos antes de empezar**
- [ ] **Abrir la app** (https://botpfilv-3.vercel.app). El servidor gratuito se "duerme" después de 15 minutos sin uso y tarda hasta un minuto en despertar. Si se abre antes, los grupos no esperan.

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
