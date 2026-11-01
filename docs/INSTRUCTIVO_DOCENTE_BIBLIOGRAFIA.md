# Instructivo: compartir la carpeta de bibliografía

**Para:** el docente de Lenguaje Visual III.
**Tiempo estimado:** 10 minutos, con computadora.
**No hace falta saber programar ni entrar a Google Cloud.** La parte técnica la hace quien administra la aplicación.

---

## ¿Para qué sirve esto?

El asistente del taller puede citar la bibliografía de la cátedra. Para eso, la aplicación tiene que poder **leer** los PDF de tu carpeta de Google Drive.

Quien administra la aplicación creó un **"usuario robot" de Google** (se llama *cuenta de servicio*) que solo puede **leer** lo que vos le compartas. No ve el resto de tu Drive, no puede borrar ni modificar nada y no tiene acceso a tu correo.

Los estudiantes nunca ven los PDF ni entran a tu Drive: la aplicación lee los textos y le pasa al asistente solo los fragmentos necesarios para cada pregunta.

## Lo que vas a hacer

1. Armar la carpeta con los PDF.
2. Compartirla con el correo del "usuario robot", como **Lector**.
3. Avisar a quien administra la aplicación y pasarle el enlace de la carpeta.

---

## Paso 1. Armar la carpeta

1. En **Google Drive** (https://drive.google.com) creá una carpeta para la bibliografía, o usá la que ya tenés.
2. Poné adentro los PDF. **Podés ordenarlos en subcarpetas** (por ejemplo "Eje 1", "Eje 2"): la aplicación las recorre todas, hasta tres niveles de profundidad.
3. Tené en cuenta:
   - **Cada PDF con un nombre distinto**, aunque estén en subcarpetas diferentes.
   - **Texto seleccionable.** Abrí el PDF y probá seleccionar una palabra con el mouse. Si no se puede, o se selecciona la página entera como una imagen, es un escaneo: pasalo por un programa de reconocimiento de texto (OCR) que **conserve las páginas**, como hiciste con Anguio y Oliveras. Por ejemplo, Adobe Acrobat → "Escanear y OCR" → "Reconocer texto".
   - **No conviertas los PDF con "Abrir con → Documentos de Google"**: cambia la paginación y el asistente citaría páginas que no coinciden con el libro.
   - Se aceptan también **Documentos de Google**. Cualquier otro tipo de archivo (imágenes, Word, etc.) se ignora.
   - **Recomendado:** el PDF de **Giglietti** tiene partes que la aplicación lee como caracteres sin sentido. Pasarlo por OCR lo resuelve.

## Paso 2. Compartir la carpeta con el "usuario robot"

Quien administra la aplicación te va a pasar un correo parecido a este (termina en `.iam.gserviceaccount.com`):

```
lector-bibliografia@nombre-del-proyecto.iam.gserviceaccount.com
```

1. En Drive, hacé **clic derecho** sobre la carpeta de bibliografía → **Compartir** → **Compartir**.
2. En el campo **"Agregar personas, grupos…"** pegá ese correo.
3. A la derecha, elegí el permiso **Lector**. **No elijas "Editor".**
4. Podés destildar **Notificar a las personas**: el "usuario robot" no lee correos.
5. Tocá **Compartir** (o **Enviar**). Si Drive avisa que la dirección no pertenece a una cuenta de Google o no puede recibir notificaciones, tocá **Compartir de todos modos**.

> Se comparte **la carpeta principal**: las subcarpetas y los archivos de adentro quedan compartidos solos.

## Paso 3. Avisar y pasar el enlace

1. Abrí la carpeta en Drive y copiá la dirección de la barra del navegador. Es parecida a `https://drive.google.com/drive/folders/1AbC…xyz`.
2. Mandásela a quien administra la aplicación, junto con estos datos de cada PDF, **solo si son nuevos o cambiaron**:
   - autor, año y título;
   - la referencia APA completa;
   - el número de página **impreso** en la primera hoja del PDF. Por ejemplo, si el PDF empieza en la página 253 del libro: "253".

Hoy faltan estos datos:

| PDF | Qué falta |
|---|---|
| Anguio | Autor, año, título y referencia APA. **Sin estos datos, este texto no se usa.** |
| Ciafardo, Giglietti, Oliveras | La referencia APA completa (editorial). |
| Zecchetto | Confirmar que el capítulo empieza en la página **183** del libro (la cuarta hoja del PDF dice "186"). |

---

## Cuando agregues o cambies un PDF más adelante

- **Agregar o reemplazar un PDF:** subilo a la carpeta, en cualquier subcarpeta, y pasale sus datos (autor, año, título, referencia y página inicial) a quien administra la aplicación.
- **Reemplazar un PDF por una versión mejor:** si mantenés el mismo nombre, no hace falta mandar nada.
- La aplicación revisa la carpeta sola cada 30 minutos.

## ¿Cómo sé si funcionó?

Abrí en el navegador **https://botpfilv3-backend.onrender.com/api/bibliografia**. La primera vez puede tardar hasta un minuto, porque el servidor gratuito "se duerme" cuando no se usa. Tenés que ver `"estado":"ok"` y la lista de los textos con su autor y título.

En la aplicación (https://botpfilv-3.vercel.app), dentro de la pantalla de trabajo, la sección **"Fuentes disponibles"** muestra la misma lista.
