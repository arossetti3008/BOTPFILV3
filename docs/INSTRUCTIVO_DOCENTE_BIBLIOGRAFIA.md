# Instructivo: dar acceso a la bibliografía

**Para:** el docente de Lenguaje Visual III.
**Tiempo estimado:** 40 minutos, con computadora (no conviene hacerlo desde el celular).
**No hace falta saber programar.** Hay que seguir los pasos en orden y copiar algunos datos.

---

## ¿Para qué sirve esto?

El asistente del taller puede citar la bibliografía de la cátedra, pero para eso la aplicación tiene que poder **leer** la carpeta "Bibliografía LV 3" de tu Google Drive.

Para que lo haga sin usar tu contraseña, se crea una **cuenta de servicio**: un "usuario robot" de Google que solo puede **leer** la carpeta que vos le compartas. No ve el resto de tu Drive, no puede borrar ni modificar nada y no tiene acceso a tu correo.

Los estudiantes nunca ven los PDF ni entran a tu Drive. La aplicación lee los textos y le pasa al asistente solo los fragmentos necesarios para cada pregunta.

## Lo que vas a hacer, en resumen

| Paso | Qué | Tiempo |
|---|---|---|
| 1 | Crear la cuenta de servicio en Google Cloud | 15 min |
| 2 | Compartir la carpeta de bibliografía con esa cuenta | 2 min |
| 3 | Crear la hoja "fuentes" con los datos de cada texto | 15 min |
| 4 | Enviar el archivo de la cuenta de servicio de forma segura | 3 min |
| 5 | (Opcional) Mejorar el PDF de Giglietti | 5 min |

Al final hay una sección **"Si algo sale mal"** y un **glosario**.

---

## Paso 1. Crear la cuenta de servicio

> Si quien administra la aplicación te dice que este paso ya lo hizo, saltá al Paso 2 y pedile el **email de la cuenta de servicio**.

### 1.1. Entrar a Google Cloud

1. Abrí **https://console.cloud.google.com** en el navegador (Chrome, Edge o Firefox).
2. Entrá con tu cuenta de Google, la misma de la carpeta de bibliografía.
3. Si es la primera vez, Google te pide **aceptar las condiciones del servicio**: elegí el país, tildá la aceptación y tocá **Aceptar y continuar**. No te pide tarjeta de crédito para esto: **no actives ninguna "prueba gratuita" ni cargues datos de pago.**

### 1.2. Crear un proyecto

Un "proyecto" es una carpeta donde Google guarda esta configuración.

1. Arriba a la izquierda, al lado del logo de Google Cloud, hay un botón con el nombre del proyecto actual, o con el texto **"Seleccionar un proyecto"**. Tocalo.
2. En la ventana que se abre, tocá **Proyecto nuevo** (arriba a la derecha).
3. En **Nombre del proyecto** escribí: `BOTPFILV3 Bibliografia`. Dejá el resto como está.
4. Tocá **Crear** y esperá unos segundos. Arriba a la derecha aparece una campanita con el aviso de que se creó.
5. Volvé a tocar el botón de arriba a la izquierda y **elegí el proyecto nuevo**. Fijate que su nombre quede escrito arriba: todo lo que sigue tiene que hacerse dentro de ese proyecto.

### 1.3. Habilitar la "Google Drive API"

Así se le permite al proyecto leer archivos de Drive.

1. Arriba, en el buscador de la consola, escribí `Google Drive API` y elegí el resultado **Google Drive API** (el que tiene el ícono de Drive).
2. Tocá el botón azul **Habilitar**.
3. Esperá a que cargue la página de la API. Si el botón ahora dice **Administrar**, quedó habilitada.

### 1.4. Crear la cuenta de servicio

1. En el buscador de arriba escribí `Cuentas de servicio` y elegí **Cuentas de servicio (IAM y administración)**.
2. Tocá **+ Crear cuenta de servicio** (arriba).
3. **Nombre de la cuenta de servicio:** `lector-bibliografia`. El campo de abajo, el ID, se completa solo.
4. **Descripción** (opcional): `Lee la bibliografía para el asistente de LV III`.
5. Tocá **Crear y continuar**.
6. Te va a ofrecer "Otorgar acceso a esta cuenta de servicio al proyecto" (roles). **No elijas nada**: tocá **Continuar** y después **Listo**.

Vas a volver a la lista de cuentas de servicio. Aparece una nueva con un **correo electrónico** parecido a este:

```
lector-bibliografia@botpfilv3-bibliografia-123456.iam.gserviceaccount.com
```

**Copiá ese correo completo** y guardalo en un documento o una nota: lo vas a usar en el Paso 2.

### 1.5. Descargar la clave

La clave es un archivo que funciona como la contraseña del "usuario robot".

1. En la lista, tocá el correo de la cuenta que acabás de crear.
2. Arriba aparecen pestañas: tocá **Claves**.
3. Tocá **Agregar clave** → **Crear clave nueva**.
4. Elegí **JSON** (viene marcado) y tocá **Crear**.
5. El navegador descarga solo un archivo con un nombre parecido a `botpfilv3-bibliografia-123456-abcdef123456.json`. Queda en tu carpeta **Descargas**.

> ⚠️ **Este archivo es como una contraseña.** No lo subas a la carpeta de bibliografía, no lo mandes por WhatsApp ni lo pegues en un grupo. Cómo enviarlo está en el Paso 4.

> Si Google muestra un mensaje del tipo "La creación de claves está inhabilitada por una política de la organización", tu cuenta es institucional y no lo permite. En ese caso, hacé este paso con una cuenta de Gmail personal.

---

## Paso 2. Compartir la carpeta con la cuenta de servicio

1. Abrí **Google Drive** (https://drive.google.com).
2. Buscá la carpeta **Bibliografía LV 3**.
3. Hacé **clic derecho** sobre la carpeta → **Compartir** → **Compartir**.
4. En el campo **"Agregar personas, grupos…"** pegá el **correo de la cuenta de servicio** del Paso 1.4. Termina en `.iam.gserviceaccount.com`.
5. A la derecha, elegí el permiso **Lector**. **No elijas "Editor".**
6. Podés destildar **Notificar a las personas**: la cuenta de servicio no lee correos.
7. Tocá **Compartir** (o **Enviar**). Si Drive avisa que la dirección no pertenece a una cuenta de Google o no puede recibir notificaciones, tocá **Compartir de todos modos**.

---

## Paso 3. Crear la hoja "fuentes"

La aplicación necesita saber, para cada PDF, **quién lo escribió, de qué año es, cómo se titula y en qué página empieza**. Así el asistente puede citarlo bien. Esos datos van en una hoja de cálculo llamada exactamente **fuentes**, dentro de la misma carpeta.

### 3.1. Crear la hoja dentro de la carpeta

1. Entrá a la carpeta **Bibliografía LV 3**.
2. Tocá **+ Nuevo** → **Hojas de cálculo de Google** → **Hoja de cálculo en blanco**.
3. Arriba a la izquierda, donde dice **"Hoja de cálculo sin título"**, hacé clic y escribí **fuentes**, todo en minúsculas y sin espacios. Tocá Enter.

### 3.2. Cargar los datos (borrador ya preparado)

Ya hay un borrador con casi todos los datos, armado a partir de tu ficha y de las portadas de los PDF. Lo podés importar así:

1. Descargá el borrador desde: **https://github.com/arossetti3008/BOTPFILV3/blob/main/docs/fuentes-borrador.csv**. Tocá el botón de descarga (**↓ Download raw file**, arriba a la derecha del contenido).
2. En la hoja **fuentes**: menú **Archivo** → **Importar** → pestaña **Subir** → elegí el archivo `fuentes-borrador.csv` que descargaste.
3. En **Ubicación de importación** elegí **Reemplazar hoja actual**. El **Tipo de separador** dejalo en "Detectar automáticamente". Tocá **Importar datos**.

Te tiene que quedar así: la **fila 1 con los títulos de las columnas** y una fila por cada PDF.

> Si preferís no descargar nada, podés escribir la tabla a mano: está completa en la sección 3.4.

### 3.3. Qué significa cada columna

| Columna | Qué poner | ¿Obligatoria? |
|---|---|---|
| **archivo** | El nombre del PDF **exactamente** como aparece en la carpeta, con el `.pdf` final. Un espacio de más o de menos hace que no lo encuentre. | Sí |
| **autor** | Como querés que lo cite el asistente. Ejemplo: `Zecchetto, V.` | Sí |
| **anio** | Año de publicación. Ejemplo: `2002`. (Se escribe "anio", sin ñ.) | Sí |
| **titulo** | Título del texto o capítulo. | Sí |
| **referenciaAPA** | La referencia completa en normas APA. Los estudiantes la ven en la lista de bibliografía. | Recomendada |
| **paginaInicial** | El número de página **impreso** en la primera hoja del PDF. Ejemplo: si el PDF empieza en la página 253 del libro, poné `253`. Si lo dejás vacío, el asistente cita "p. 3 del PDF". | Recomendada |
| **dimensiones** | Podés dejarlo vacío. | No |
| **corpus** | Escribí `corpus-1-feminidad` para que ese texto tenga prioridad en ese corpus, o `todos`. | No |

> **No cambies los títulos de la fila 1.** Tienen que quedar exactamente: `archivo`, `autor`, `anio`, `titulo`, `referenciaAPA`, `paginaInicial`, `dimensiones`, `corpus`.

### 3.4. Lo que tenés que completar o revisar

El borrador se armó solo con datos verificables; **lo que no se pudo verificar quedó vacío**. Si un texto no tiene **autor, año y título**, la aplicación no lo usa: nunca inventa datos.

| Archivo | Ya completo | Te falta |
|---|---|---|
| `Documento de cátedra Lenguaje Visual III - Matriz de análisis del discurso visual.pdf` | Autor (Cátedra LV III), 2026, título, referencia | Nada. El PDF no tiene números de página: queda vacío y está bien. |
| `Eje 1 - Zecchetto (1).pdf` | Zecchetto, V., 2002, título, referencia | **Confirmar `paginaInicial`**: puse `183` porque la cuarta hoja del PDF dice "186". Si el capítulo empieza en otra página, corregilo. |
| `Eje 1 -Ciafardo.pdf` | Ciafardo, M., 2020, título, página 340 | **referenciaAPA** completa (libro compilado, editorial). |
| `Eje 1 - Giglietti.pdf` | Giglietti, N., 2020, título, página 253 | **referenciaAPA** completa. |
| `Oliveras_capitulos_1_10_11_OCR.pdf` | Oliveras, E., 2021, título | **referenciaAPA** y, si podés, **paginaInicial**. |
| `Eje 1 - Anguio_OCR.pdf` | Nada | **autor, anio, titulo y referenciaAPA.** No figura en la ficha del corpus. Sin estos datos, este texto no se usa. Como es un escaneo de dos páginas por hoja, dejá `paginaInicial` vacío. |

Los cambios se guardan solos (Google Sheets no tiene botón "Guardar").

---

## Paso 4. Enviar el archivo de la cuenta de servicio (de forma segura)

La aplicación necesita el contenido del archivo `.json` del Paso 1.5. Quien administra la aplicación lo carga en el servidor (Render).

**Forma segura de enviarlo:**

1. En tu Google Drive, subí el archivo `.json` a **"Mi unidad"**. **No a la carpeta de bibliografía.**
2. Clic derecho sobre el archivo → **Compartir** → escribí el correo de **quien administra la aplicación** → permiso **Lector** → **Enviar**.
3. Avisale por mensaje que ya está compartido.
4. Cuando te confirme que lo cargó, **borrá el archivo** de tu Drive y de tu carpeta **Descargas**. Si alguna vez hiciera falta otra clave, se crea una nueva en un minuto (Paso 1.5).

> **No lo mandes por WhatsApp, por correo como adjunto ni lo pegues en un chat grupal.**

---

## Paso 5 (opcional). Mejorar el PDF de Giglietti

El PDF de Giglietti tiene texto que la aplicación lee como caracteres sin sentido (por ejemplo "ŠŸŧŃ ôú"). Pasa en 14 de sus 29 páginas, por un problema con las fuentes tipográficas del archivo. El asistente puede usar el resto, pero esas partes se pierden.

**Cómo resolverlo:** hacé con ese PDF lo mismo que hiciste con los de Anguio y Oliveras: pasalo por un programa de reconocimiento de texto (OCR) que **conserve las páginas**, por ejemplo Adobe Acrobat → "Escanear y OCR" → "Reconocer texto". Después:

1. Subí el PDF nuevo a la carpeta, **con el mismo nombre** (`Eje 1 - Giglietti.pdf`), y borrá el anterior.
2. No hace falta tocar la hoja "fuentes" si el nombre es el mismo.

> **No uses "Abrir con → Documentos de Google"** para convertirlo: reconoce el texto, pero cambia la paginación, y el asistente citaría páginas que no coinciden con el libro.

---

## ¿Cómo sé si funcionó?

Cuando quien administra la aplicación haya cargado la clave:

1. Abrí en el navegador: **https://botpfilv3-backend.onrender.com/api/bibliografia**
   - La primera vez puede tardar hasta un minuto: el servidor gratuito se "duerme" cuando no se usa.
2. Tenés que ver un texto con `"estado":"ok"` y la lista de los textos con su autor y título.
3. En la aplicación (https://botpfilv-3.vercel.app), abrí **"Fuentes disponibles"** en la pantalla de trabajo: aparece la misma lista.

**Cada vez que cambies algo** (un PDF nuevo o una fila de la hoja), la aplicación lo toma sola en un máximo de **30 minutos**. Si lo necesitás antes, pedile a quien administra la aplicación que "fuerce la sincronización".

---

## Si algo sale mal

| Qué pasa | Qué revisar |
|---|---|
| En `/api/bibliografia` dice `"estado":"sin-configurar"` | Todavía no se cargó la clave en el servidor (Paso 4). |
| Dice que **no encontró la carpeta** | La carpeta no está compartida con el correo de la cuenta de servicio (Paso 2), o se compartió con otro correo. Revisá que termine en `.iam.gserviceaccount.com`. |
| Dice que **negó el acceso** | Falta habilitar la **Google Drive API** en el proyecto (Paso 1.3). Revisá que estés en el proyecto correcto, arriba a la izquierda. |
| Dice **"No se encontró la hoja fuentes"** | La hoja tiene que llamarse exactamente `fuentes` y estar **dentro** de la carpeta Bibliografía LV 3. |
| Dice que **faltan columnas** | Revisá la fila 1 de la hoja: los ocho títulos, escritos exactamente igual (sección 3.3). |
| Un texto **no aparece** en la lista | Revisá que el nombre en la columna `archivo` sea idéntico al del PDF (espacios y `.pdf` incluidos) y que tenga autor, año y título. |
| Avisa **"página sin texto"** de un PDF | Es un escaneo sin texto reconocido: pasalo por OCR (Paso 5). |

---

## Glosario

- **Google Cloud:** el servicio de Google donde se configuran herramientas para aplicaciones. Para esto se usa gratis.
- **Proyecto:** el espacio dentro de Google Cloud donde queda guardada esta configuración.
- **API:** la "puerta" por la que una aplicación habla con un servicio de Google. Habilitar la "Google Drive API" es permitir que el proyecto lea Drive.
- **Cuenta de servicio:** un "usuario robot" de Google, con un correo propio, que solo puede hacer lo que le permitas. En este caso, leer una carpeta.
- **Clave (archivo JSON):** el archivo que identifica a la cuenta de servicio. Funciona como una contraseña.
- **Hoja "fuentes":** la planilla con los datos de cada texto, para que el asistente cite bien.
- **OCR:** reconocimiento de texto en una imagen. Convierte un PDF escaneado en uno con texto seleccionable.
