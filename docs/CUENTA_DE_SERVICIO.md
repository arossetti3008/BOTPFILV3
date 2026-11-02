# Cuenta de servicio para leer la bibliografía (para quien administra la app)

La aplicación lee la carpeta de bibliografía del docente con una **cuenta de servicio**: un "usuario robot" de Google, con correo propio, que solo puede leer lo que se le comparte.

**Reparto de tareas:**

| Quién | Qué |
|---|---|
| Quien administra la app | Crea la cuenta de servicio, la carga en Render y le pasa el correo al docente (esta guía). |
| El docente | Arma la carpeta y la comparte con ese correo ([INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md](INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md)). |

Tiempo estimado: 15 minutos. Es gratis: **no actives ninguna prueba ni cargues datos de pago**.

---

## 1. Entrar al proyecto de Google Cloud

Usá el **mismo proyecto de tu clave de Gemini**: AI Studio lo creó solo y en tu cuenta se llama "Proyecto de Gemini".

1. Abrí **https://console.cloud.google.com** con la misma cuenta de Google de AI Studio. Si es la primera vez, aceptá las condiciones.
2. Arriba a la izquierda, al lado del logo, tocá el selector de proyecto y elegí **"Proyecto de Gemini"**. Si no aparece, tocá la pestaña **Todos**.
3. Fijate que el nombre del proyecto quede escrito arriba: todo lo que sigue se hace dentro de él.

## 2. Habilitar la Google Drive API

1. En el buscador de arriba escribí `Google Drive API` y elegí ese resultado.
2. Tocá **Habilitar**. Si el botón ya dice **Administrar**, ya estaba habilitada.

## 3. Crear la cuenta de servicio

1. En el buscador escribí `Cuentas de servicio` y elegí **Cuentas de servicio (IAM y administración)**.
2. **+ Crear cuenta de servicio**.
3. Nombre: `lector-bibliografia`. Descripción (opcional): `Lee la bibliografía de LV III`.
4. **Crear y continuar**. En "Otorgar acceso al proyecto" **no elijas ningún rol**: **Continuar** → **Listo**.
5. En la lista aparece el correo de la cuenta, del tipo `lector-bibliografia@<proyecto>.iam.gserviceaccount.com`. **Copialo**: se lo vas a pasar al docente.

## 4. Crear la clave y cargarla en Render

1. Tocá el correo de la cuenta → pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → **JSON** → **Crear**. Se descarga un archivo `.json`.
2. Abrí ese archivo con el **Bloc de notas** (clic derecho → Abrir con → Bloc de notas), seleccioná todo (Ctrl+A) y copialo (Ctrl+C).
3. En **Render** → `botpfilv3-backend` → **Environment** (sección **Environment Variables**, no "Secret Files"). Si alguna de estas variables no aparece en la lista, creala con **Edit** → **+ Add Environment Variable**, escribiendo el nombre exacto en **Key**: Render no guarda las variables que quedaron vacías al crear el servicio.
   - `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` → pegá el contenido completo del archivo, tal cual, empezando por `{` y terminando por `}`.
   - `DRIVE_FOLDER_ID` → el id de la carpeta del docente: la parte final del enlace, después de `/folders/`. En `https://drive.google.com/drive/folders/1AbC…xyz`, es `1AbC…xyz`.
   - Si todavía no tenés el enlace del docente, dejá `DRIVE_FOLDER_ID` para después.
   - **Save Changes**. Render se reinicia solo en uno o dos minutos.
4. **Borrá el archivo `.json`** de tu carpeta Descargas: ya está guardado en Render. Si alguna vez hiciera falta, se crea otra clave en un minuto.

> ⚠️ El archivo `.json` es una contraseña. No lo subas a GitHub ni a Drive, ni lo mandes por chat.

> Si Google dice que la creación de claves está bloqueada por una política de la organización, la cuenta es institucional. Usá una cuenta de Gmail personal.

## 5. Pasarle el correo al docente

Mandale al docente el correo del paso 3.5 y el [instructivo](INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md). Él comparte la carpeta con ese correo como **Lector** y te pasa el enlace de la carpeta (que va en `DRIVE_FOLDER_ID`).

## 6. Verificar

1. Abrí **https://botpfilv3-backend.onrender.com/api/health** y mirá la sección `bibliografia`:
   - `"estado": "ok"` y `fuentes` mayor que 0: funciona.
   - `"estado": "error"`: el campo `error` dice qué pasa (tabla de abajo).
2. **Forzar una sincronización** sin esperar los 30 minutos, en PowerShell (el `ADMIN_TOKEN` está en Render → Environment):

```powershell
Invoke-RestMethod -Method Post -Uri "https://botpfilv3-backend.onrender.com/api/admin/sincronizar" -Headers @{ "x-admin-token" = "PEGAR_AQUI_EL_ADMIN_TOKEN" }
```

La respuesta dice cuántas fuentes, páginas y fragmentos indexó, de dónde tomó los datos de las fuentes y las advertencias.

| Error | Qué revisar |
|---|---|
| "Google rechazó las credenciales…" | Que el contenido pegado en Render sea el archivo `.json` completo y que la clave no se haya borrado en Google Cloud. |
| "Drive no encontró la carpeta…" | `DRIVE_FOLDER_ID`, y que el docente haya compartido la carpeta con el correo de la cuenta de servicio. |
| "Drive negó el acceso…" | Que la Google Drive API esté habilitada en el mismo proyecto de la cuenta de servicio (paso 2). |
| "No se encontraron los datos de las fuentes…" | Falta `backend/contenidos/fuentes.csv` (ver abajo). |

## 7. Los datos de cada texto (autor, año, título, página)

La aplicación los toma de **`backend/contenidos/fuentes.csv`**, en el repositorio. Si algún día el docente pone una hoja de cálculo llamada `fuentes` dentro de la carpeta de Drive, esa tiene prioridad.

Columnas: `archivo,autor,anio,titulo,referenciaAPA,paginaInicial,dimensiones,corpus`.

- **`archivo`:** el nombre exacto del PDF en Drive, con `.pdf`. Da igual en qué subcarpeta esté.
- **Filas sin `autor`, `anio` o `titulo`:** se omiten (nunca se inventan datos).
- **`paginaInicial`:** la página impresa de la primera hoja del PDF. Vacío = se cita "p. X del PDF".
- **`corpus`:** `corpus-1-feminidad`, para dar prioridad a esa fuente en ese corpus, o `todos`.

Cuando el docente te pase datos nuevos, editá el archivo (o pedime que lo haga) y subí el cambio a `main`. Render se actualiza solo.
