# Guía docente — BOTPFILV3

> En construcción. La sección de bibliografía ya está completa; el resto (clave de Gemini, corpus, imágenes, día del taller) se completa en la Etapa 6.

## Bibliografía desde Google Drive

Los estudiantes nunca ven los PDFs ni entran a Drive. La aplicación lee la carpeta con una **cuenta de servicio**, que es un "usuario robot" de Google con permiso de solo lectura. Después le envía al asistente únicamente los fragmentos que hacen falta para cada mensaje.

Se configura una sola vez. Después, para actualizar la bibliografía alcanza con subir el PDF a la carpeta, agregar su fila en la hoja `fuentes` y esperar hasta 30 minutos (o forzar la actualización, ver el paso 6).

### Paso 1. Crear la cuenta de servicio (Google Cloud)

Usá el mismo proyecto de Google Cloud donde creaste la clave de Gemini.

1. Entrá a https://console.cloud.google.com y elegí ese proyecto arriba a la izquierda.
2. **Habilitá la Google Drive API:** menú → "APIs y servicios" → "Biblioteca" → buscá "Google Drive API" → "Habilitar".
3. **Creá la cuenta:** menú → "IAM y administración" → "Cuentas de servicio" → "Crear cuenta de servicio". Ponele un nombre, por ejemplo `lector-bibliografia`. No hace falta asignarle roles: tocá "Listo".
4. **Copiá su email.** Tiene la forma `lector-bibliografia@<proyecto>.iam.gserviceaccount.com`. Lo vas a usar en el paso 3.
5. **Descargá la clave:** entrá a la cuenta → pestaña "Claves" → "Agregar clave" → "Crear clave nueva" → **JSON**. Se descarga un archivo `.json`.
   - Guardalo en un lugar seguro: es una contraseña.
   - No lo subas a GitHub, no lo mandes por chat y no lo pongas dentro de la carpeta compartida.

### Paso 2. Armar la carpeta

Creá una carpeta en tu Drive (por ejemplo `Bibliografía LV III`) con este contenido:

```
Bibliografía LV III/
├── fuentes          ← Hoja de cálculo de Google con los datos de cada texto
├── <capítulo 1>.pdf
├── <capítulo 2>.pdf
└── ...
```

- Se aceptan **PDF** y **Google Docs**. Cualquier otro tipo de archivo se ignora y queda una advertencia.
- Los PDF tienen que tener **texto seleccionable**. Si es un escaneo (una foto de la página), la aplicación no puede leerlo y lo informa como "página sin texto". Ver "Si tenés PDFs escaneados" más abajo.
- Volumen previsto: hasta unas 100 páginas en total.

#### Si tenés PDFs escaneados

**Cómo darte cuenta:** abrí el PDF y tratá de seleccionar una palabra con el mouse. Si no se puede, o se selecciona la página entera como una imagen, es un escaneo.

**Qué hacer** (una sola vez por archivo, antes de subirlo):

1. Pasalo por una herramienta de reconocimiento de texto (OCR) que genere un **PDF con texto que conserve las páginas originales**. Por ejemplo, Adobe Acrobat ("Escanear y OCR" → "Reconocer texto"), el software del escáner o cualquier herramienta "OCR a PDF".
2. Revisá un par de páginas: seleccioná texto y fijate que se lea bien, sobre todo los nombres propios y las tildes.
3. Subí a la carpeta **el PDF nuevo en lugar del escaneado**, con el mismo nombre que figura en la hoja `fuentes`.
4. Forzá la actualización (paso 6) y confirmá en el reporte que ya no aparece "sin texto".

**No conviene** convertirlo con "Abrir con → Documentos de Google": reconoce el texto, pero cambia la paginación, y el asistente citaría páginas que no coinciden con el libro.

La aplicación no hace OCR por su cuenta, a propósito: el servidor gratuito no tiene memoria suficiente y tardaría minutos en cada arranque.

### Paso 3. Compartir la carpeta con la cuenta de servicio

En Drive: clic derecho en la carpeta → "Compartir" → pegá el email del paso 1 → permiso **Lector** → "Enviar". Si Drive avisa que el email no puede recibir notificaciones, está bien: compartí igual.

### Paso 4. Completar la hoja `fuentes`

Creá dentro de la carpeta una **Hoja de cálculo de Google** llamada exactamente `fuentes`. La primera fila lleva estos encabezados, **escritos exactamente así**:

| archivo | autor | anio | titulo | referenciaAPA | paginaInicial | dimensiones | corpus |
|---|---|---|---|---|---|---|---|
| EJEMPLO — reemplazar.pdf | EJEMPLO Apellido, N. | 2000 | EJEMPLO — título del capítulo | EJEMPLO Apellido, N. (2000). Título. Editorial. | 23 | retorico, enunciativo | todos |

Qué va en cada columna:

| Columna | Obligatoria | Qué poner |
|---|---|---|
| `archivo` | Sí | El nombre **exacto** del archivo en la carpeta, con `.pdf` si lo tiene. En un Google Doc, su título tal cual. |
| `autor` | Sí | Como querés que lo cite el asistente. |
| `anio` | Sí | Año de publicación. |
| `titulo` | Sí | Título del capítulo o texto. |
| `referenciaAPA` | Recomendada | La referencia completa en APA. Los estudiantes la ven en la lista de bibliografía. |
| `paginaInicial` | Recomendada | El número de página **impreso** en la primera página del PDF. Si el PDF empieza en la página 23 del libro, poné `23`, y el asistente va a citar "p. 24" cuando el fragmento esté en la segunda hoja del PDF. Si la dejás vacía, cita "p. 2 del PDF". |
| `dimensiones` | No | Dimensiones de análisis con las que se relaciona, separadas por coma. Por ahora es informativo. |
| `corpus` | No | Ids de los corpus (de `corpus.json`) a los que corresponde, separados por coma, o `todos`. Esas fuentes tienen prioridad cuando un grupo trabaja con ese corpus. |

Reglas:

- **Archivo sin fila en la hoja, o fila sin archivo:** se omite y queda una advertencia. La aplicación nunca inventa datos.
- **Fila sin `autor`, `anio` o `titulo`:** se omite.

### Paso 5. Cargar las credenciales en el backend

En las variables de entorno del backend (en Render: "Environment"; en local: `backend/.env`):

| Variable | Valor |
|---|---|
| `DRIVE_FOLDER_ID` | El id de la carpeta: la parte final de su dirección, después de `/folders/`. En `https://drive.google.com/drive/folders/1AbC...xyz`, es `1AbC...xyz`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | El archivo `.json` del paso 1, convertido a base64 (ver abajo). |
| `ADMIN_TOKEN` | Una contraseña larga inventada, para forzar la actualización (ver abajo). |
| `DRIVE_RESYNC_MINUTOS` | Cada cuántos minutos revisa si hay cambios. Por defecto, `30`. |

**Convertir el JSON a base64** en Windows (PowerShell), cambiando la ruta por la de tu archivo:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\al\archivo.json")) | Set-Clipboard
```

Queda copiado en el portapapeles, listo para pegar como valor de la variable.

**Generar un `ADMIN_TOKEN`:**

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### Paso 6. Verificar y forzar la actualización

- **Ver el estado:** abrí `https://<tu-backend>/api/health` en el navegador. En `bibliografia` aparecen:
  - `estado`, que debería decir `ok`;
  - la fecha de la última sincronización;
  - las fuentes, las páginas y las páginas sin texto;
  - las `advertencias`.
- **Forzar la actualización** después de subir un archivo, sin esperar los 30 minutos (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri "https://<tu-backend>/api/admin/sincronizar" -Headers @{ "x-admin-token" = "<tu ADMIN_TOKEN>" }
```

Devuelve un reporte con fuentes, páginas, fragmentos, palabras y advertencias.

### Si algo falla

| Mensaje en `/api/health` | Qué revisar |
|---|---|
| `Google rechazó las credenciales…` | Que el base64 sea del `.json` correcto y que la clave no haya sido borrada en Google Cloud. |
| `Drive no encontró la carpeta…` | `DRIVE_FOLDER_ID`, y que la carpeta esté compartida con el email de la cuenta de servicio. |
| `Drive negó el acceso…` | Que la Google Drive API esté habilitada en el proyecto (paso 1). |
| `No se encontró la hoja "fuentes"` | Que la hoja se llame exactamente `fuentes` y esté dentro de la carpeta. |
| `A la hoja "fuentes" le faltan columnas…` | Los encabezados de la primera fila (paso 4). |
| `…página N del PDF: sin texto` | El PDF es un escaneo. Conseguí una versión con texto seleccionable. |

Si Drive falla, el chat sigue funcionando: con la bibliografía de la última sincronización correcta, o sin fuentes si nunca se pudo sincronizar. En ese caso el asistente avisa que no puede citar.
