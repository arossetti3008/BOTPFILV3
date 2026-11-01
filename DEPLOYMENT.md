# Despliegue — BOTPFILV3

Cómo se publica la aplicación, sin exponer ningún valor secreto: esos viven únicamente en los paneles de cada plataforma.

## Arquitectura

| Parte | Plataforma | Carpeta del repo | Rama |
|---|---|---|---|
| Backend (Express + Gemini + Drive) | Render, Web Service gratuito | `backend/` | `main` |
| Frontend (React + Vite) | Vercel, plan Hobby | `frontend/` | `main` |

Cada vez que se sube un cambio a `main`, las dos plataformas se actualizan solas.

## Orden de creación

Primero Render (para obtener la URL del backend), después Vercel (que necesita esa URL) y al final se vuelve a Render para cargar la URL de Vercel.

### 1. Backend en Render

1. Entrá a https://dashboard.render.com con tu cuenta de GitHub.
2. **New → Blueprint**, elegí el repositorio `BOTPFILV3` y la rama `main`. Render lee `render.yaml` y propone el servicio `botpfilv3-backend`.
3. Te va a pedir los valores marcados como secretos:

| Variable | Valor |
|---|---|
| `LLM_API_KEY` | La clave de Gemini (AI Studio). |
| `FRONTEND_URL` | Por ahora poné `https://example.com`. Se corrige en el paso 3. |
| `DRIVE_FOLDER_ID` | `1WM4dhEaXClSmRNln8pt_LPeFcWdiDqnA` (carpeta "Bibliografía LV 3"). |
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | El contenido del archivo `.json` de la cuenta de servicio: abrilo con el Bloc de notas, copiá **todo** y pegalo tal cual (también acepta el texto en base64). Ver `docs/INSTRUCTIVO_DOCENTE_BIBLIOGRAFIA.md`. Si todavía no está, dejalo vacío: la app funciona sin bibliografía. |

4. **Apply**. El primer despliegue tarda unos minutos. Al terminar, copiá la URL del servicio (por ejemplo `https://botpfilv3-backend.onrender.com`).
5. Comprobá que responde: abrí `<URL>/api/health`. Tiene que mostrar `"estado": "ok"`.

`ADMIN_TOKEN` lo genera Render solo. Lo ves en el servicio → **Environment**.

### 2. Frontend en Vercel

1. Entrá a https://vercel.com con tu cuenta de GitHub → **Add New → Project** → importá `BOTPFILV3`.
2. **Root Directory:** `frontend`. Vercel detecta Vite solo (build `npm run build`, salida `dist`).
3. **Environment Variables:** `VITE_API_URL` = `<URL de Render>/api`. Por ejemplo, `https://botpfilv3-backend.onrender.com/api`.
   - Cargala como variable común, no como "Secret": Vite la incluye en el código del navegador a propósito.
4. **Deploy**. Copiá la URL que te da (por ejemplo `https://botpfilv3.vercel.app`).

### 3. Conectar los dos

En Render → servicio → **Environment** → cambiá `FRONTEND_URL` por la URL exacta de Vercel, **sin barra final**. Render se reinicia solo.

## Problemas conocidos

- **"No se pudo conectar con el servidor" en la app:** `FRONTEND_URL` en Render no coincide exactamente con la URL de Vercel (CORS). Revisá que no tenga una barra final ni `http` en lugar de `https`.
- **Cambié `VITE_API_URL` y no toma efecto:** Vite fija esa variable al construir la app. Después de cambiarla, hay que hacer **Redeploy** en Vercel.
- **El primer pedido tarda hasta un minuto:** Render gratuito duerme el servicio tras 15 minutos sin uso. La app muestra "El servidor está despertando". **El día del taller, abrí la app 5 minutos antes** para despertarlo.
- **Cambié un texto en `backend/contenidos/` (aviso, corpus, dimensiones):** hay que subir el cambio a GitHub (`main`). Render se actualiza solo en uno o dos minutos.
- **Cambié la bibliografía en Drive:** no hace falta redesplegar. Se actualiza sola cada 30 minutos, o al instante forzando la sincronización (ver `docs/GUIA_DOCENTE.md`).
- **La cuota diaria de Gemini se reinicia a las 05:00 de Argentina.** Si se agota la del modelo principal, la app pasa sola al modelo de respaldo.
