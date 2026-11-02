# Instructivo: la carpeta de materiales del taller

**Para:** el docente de Lenguaje Visual III.
**Tiempo estimado:** 20 minutos con computadora, más el tiempo de escribir las fichas.
**No hace falta saber programar ni entrar a Google Cloud.** La parte técnica la hace quien administra la aplicación.

---

## ¿Para qué sirve esto?

La aplicación toma de **una sola carpeta de tu Google Drive** todo lo que usa el taller:

- **La bibliografía** de la cátedra (los PDF), que el asistente cita.
- **Los corpus**: las 3 fotos de cada corpus y su ficha, que ven los grupos.

Quien administra la aplicación creó un **"usuario robot" de Google** (se llama *cuenta de servicio*) que solo puede **leer** lo que vos le compartas. No ve el resto de tu Drive, no puede borrar ni modificar nada y no tiene acceso a tu correo.

Los estudiantes nunca entran a tu Drive: la aplicación les muestra las fotos y las fichas, y le pasa al asistente solo los fragmentos de bibliografía necesarios para cada pregunta.

**Una ventaja:** para cambiar una foto, corregir una ficha o agregar un corpus nuevo, lo hacés directamente en Drive. La aplicación lo toma sola en hasta 30 minutos.

## Lo que vas a hacer

1. Armar la carpeta con esta estructura.
2. Compartirla con el correo del "usuario robot", como **Lector**.
3. Pasarle el enlace a quien administra la aplicación.

---

## Paso 1. Armar la carpeta

```
📁 Taller LV III                  ← la carpeta principal (el nombre es libre)
   📁 Bibliografía                ← los PDF, comunes a todos los corpus
       📁 Eje 1                   ← subcarpetas opcionales
       📁 Eje 2
   📁 Corpus 1                    ← un corpus: 3 fotos + la ficha
       🖼️ 01_sherman.jpg
       🖼️ 02_kruger.jpg
       🖼️ 03_guerrilla_girls.jpg
       📄 Ficha                   ← documento de Google
   📁 Corpus 2
       ...
```

Los nombres de las carpetas tienen que **empezar** con "Bibliografía" y con "Corpus". Lo que sigue es libre, por ejemplo "Corpus 2 - Territorio". No importan las mayúsculas ni las tildes.

### La carpeta "Bibliografía"

- Poné adentro los PDF. **Podés ordenarlos en subcarpetas** (hasta tres niveles).
- **Cada PDF con un nombre distinto**, aunque estén en subcarpetas diferentes.
- **Texto seleccionable.** Abrí el PDF y probá seleccionar una palabra con el mouse. Si no se puede, es un escaneo: pasalo por un programa de reconocimiento de texto (OCR) que **conserve las páginas**, como hiciste con Anguio y Oliveras. Por ejemplo, Adobe Acrobat → "Escanear y OCR" → "Reconocer texto".
- **No conviertas los PDF con "Abrir con → Documentos de Google"**: cambia la paginación y el asistente citaría páginas que no coinciden con el libro.
- **Recomendado:** el PDF de **Giglietti** tiene partes que la aplicación lee como caracteres sin sentido. Pasarlo por OCR lo resuelve.

### Cada carpeta "Corpus"

Lleva **exactamente 3 fotos y una ficha**. Nada más: cualquier otro archivo se ignora.

**Las fotos:**
- En **JPG**, PNG o WEBP. Los iPhone a veces guardan en HEIC: esas hay que convertirlas a JPG.
- **Livianas:** menos de 500 KB y como máximo 1600 píxeles de lado. Se ven desde celulares y viajan al asistente.
- Si no indicás otra cosa en la ficha, el orden es el **alfabético** del nombre del archivo. Por eso conviene empezar los nombres con 01, 02, 03.

**La ficha:**
1. Dentro de la carpeta del corpus: **Nuevo → Documentos de Google**.
2. Ponele de nombre **Ficha**.
3. Escribí los datos con este formato, **un dato por renglón**, con la etiqueta seguida de dos puntos:

```
Título: Representaciones de la feminidad en la cultura visual
Problemática: La construcción y el cuestionamiento de las representaciones de la feminidad en la cultura visual contemporánea, considerando las relaciones entre cuerpo, identidad y poder.
Eje de comparabilidad: Las tres producciones recurren a representaciones visuales de lo femenino, pero emplean diferentes estrategias discursivas, genéricas y enunciativas.

Imagen 1
Archivo: 01_sherman.jpg
Título: Untitled Film Still #21
Autor: Cindy Sherman
Año: 1978
Soporte: Fotografía en blanco y negro, copia en gelatina de plata
Procedencia: Museum of Modern Art (MoMA), Nueva York
Fuente: https://www.moma.org/collection/works/56618/
Texto alternativo: Fotografía en blanco y negro de una mujer con vestimenta formal, en un espacio urbano.

Imagen 2
Título: Untitled (Your body is a battleground)
Autor: Barbara Kruger
...

Imagen 3
...
```

| Dato | ¿Obligatorio? | Para qué sirve |
|---|---|---|
| Título (del corpus, arriba de todo) | No | Lo ven los grupos al elegir. Si falta, se usa el nombre de la carpeta. |
| **Problemática** | **Sí** | La ven los grupos y la recibe el asistente. |
| **Eje de comparabilidad** | **Sí** | Lo recibe el asistente para orientar la comparación. |
| "Imagen 1", "Imagen 2", "Imagen 3" | **Sí** | Cada una empieza una sección. |
| **Título** (de la obra) | **Sí** | |
| Archivo | No | El nombre de la foto, si no querés depender del orden alfabético. |
| Autor, Año, Soporte, Procedencia | Recomendados | El asistente los recibe como ficha de la obra. |
| Fuente | No | Enlace a la ficha de la obra en el museo o archivo. Los grupos lo ven como "Ver ficha en el museo". |
| Texto alternativo | Recomendado | Descripción breve para estudiantes que usan lectores de pantalla. **El asistente no la recibe**, así no "ve" la imagen sin que el grupo la describa. |

Un texto largo puede seguir en el renglón de abajo: se suma al dato anterior. También se aceptan sinónimos ("Autora", "Técnica", "Enlace").

> La ficha del **corpus 1** ya está escrita en este formato: https://github.com/arossetti3008/BOTPFILV3/blob/main/docs/ficha-corpus-1.txt. Copiá ese texto en el documento "Ficha" de la carpeta "Corpus 1".

> **Cambiar el nombre de una carpeta "Corpus" cambia el corpus para la aplicación.** Si un grupo tenía una conversación empezada con ese corpus, no la puede seguir. Durante el taller, no cambies los nombres de las carpetas.

## Paso 2. Compartir la carpeta con el "usuario robot"

Quien administra la aplicación te va a pasar un correo parecido a este (termina en `.iam.gserviceaccount.com`):

```
lector-bibliografia@nombre-del-proyecto.iam.gserviceaccount.com
```

1. En Drive, hacé **clic derecho** sobre la **carpeta principal** → **Compartir** → **Compartir**.
2. En el campo **"Agregar personas, grupos…"** pegá ese correo.
3. A la derecha, elegí el permiso **Lector**. **No elijas "Editor".**
4. Podés destildar **Notificar a las personas**: el "usuario robot" no lee correos.
5. Tocá **Compartir** (o **Enviar**). Si Drive avisa que la dirección no pertenece a una cuenta de Google o no puede recibir notificaciones, tocá **Compartir de todos modos**.

> Se comparte **solo la carpeta principal**: lo de adentro queda compartido solo.

## Paso 3. Pasar el enlace

1. Abrí la **carpeta principal** en Drive y copiá la dirección de la barra del navegador. Es parecida a `https://drive.google.com/drive/folders/1AbC…xyz`.
2. Mandásela a quien administra la aplicación, junto con estos datos de cada PDF de la bibliografía, **solo si son nuevos o cambiaron**:
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

## Cuando cambies algo más adelante

| Querés… | Qué hacer |
|---|---|
| Agregar un PDF | Subilo a "Bibliografía" y pasale sus datos (autor, año, título, referencia y página inicial) a quien administra la aplicación. |
| Reemplazar un PDF por una versión mejor | Si mantenés el mismo nombre, no hace falta avisar. |
| Cambiar una foto o corregir una ficha | Hacelo en Drive. No hace falta avisar. |
| Agregar un corpus | Creá otra carpeta "Corpus …" con sus 3 fotos y su ficha. No hace falta avisar. |

La aplicación revisa la carpeta sola cada 30 minutos. Si algo de una carpeta "Corpus" está mal, ese corpus no se muestra (o se sigue mostrando su versión anterior) y quien administra la aplicación ve el motivo.

## ¿Cómo sé si funcionó?

Abrí la aplicación (https://botpfilv-3.vercel.app) y fijate que aparezcan tus corpus para elegir, con sus fotos. La primera vez puede tardar hasta un minuto, porque el servidor gratuito "se duerme" cuando no se usa. Dentro de la pantalla de trabajo, la sección **"Fuentes disponibles"** muestra la bibliografía que la aplicación pudo leer.
