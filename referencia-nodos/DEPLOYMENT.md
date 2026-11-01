# Despliegue — Nódos

Este documento describe cómo está desplegado el proyecto en producción, sin exponer ningún valor secreto (esos viven únicamente en los paneles de cada plataforma).

## Arquitectura de despliegue

- **Frontend**: Vercel, root directory `Frontend/`, build automático desde la rama `main` de este repo.
- **Backend**: Render (Web Service), root directory `Backend/`, build command `npm install`, start command `npm start`.
- **Base de datos**: MongoDB Atlas (cluster M0, free tier).

## Variables de entorno requeridas

### Backend (Render → Environment)

| Variable | Descripción |
|---|---|
| `MONGO_URI` | Connection string del cluster de MongoDB Atlas |
| `JWT_SECRET` | Secreto para firmar el access token |
| `JWT_REFRESH_SECRET` | Secreto para firmar el refresh token (distinto al anterior) |
| `JWT_EXPIRES_IN` | Duración del access token (ej: `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token (ej: `7d`) |
| `LLM_API_KEY` | API key de Google AI Studio (Gemini) |
| `GEMINI_MODEL` | Alias del modelo (ej: `gemini-flash-latest`) |
| `FRONTEND_URL` | URL exacta del frontend en Vercel, para CORS (sin barra al final) |
| `NODE_ENV` | `production` |

### Frontend (Vercel → Environment Variables)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL del backend en Render + `/api` (ej: `https://nodos-backed.onrender.com/api`). **Importante**: debe configurarse como variable de tipo texto plano/Config, no como "Secret" — Vite la incluye en el bundle público del navegador a propósito, y marcarla como Secret puede impedir que se inyecte correctamente en el build. |

## Poblar la base de datos en producción

El catálogo de nodos no se crea solo: hay que correr el script de seed apuntando al `MONGO_URI` de producción (una sola vez, o cada vez que se recree la base):

```bash
# En Backend/, con MONGO_URI del .env apuntando temporalmente al Atlas de producción
npm run seed
```

## Problemas conocidos y solución

- **CORS bloqueando el login** (`No 'Access-Control-Allow-Origin' header is present`): la variable `FRONTEND_URL` en Render no coincide exactamente con la URL del frontend, o no está seteada. Debe ser exactamente `https://<tu-proyecto>.vercel.app`, sin barra final.
- **Cambios en `VITE_API_URL` que no toman efecto**: Vite incorpora las variables de entorno en el momento del build, no en tiempo de ejecución. Cualquier cambio requiere un **Redeploy** manual en Vercel para aplicarse.
- **Cold start en Render (free tier)**: el servicio se duerme tras 15 minutos de inactividad; el primer request después de eso puede tardar 30-60 segundos en responder.
