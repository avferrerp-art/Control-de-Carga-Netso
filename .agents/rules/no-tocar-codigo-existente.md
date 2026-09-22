---
trigger: always_on
---

# Reglas del proyecto Control de Cargas Netso

Este proyecto es un dashboard de una sola página: `index.html`, sin build, sin
frameworks, sin gestor de paquetes. HTML + CSS + JavaScript vanilla en el mismo
archivo. Lee datos de una hoja de Google publicada en la web y se despliega en
Netlify como sitio estático.

## Principio general

**Este es un proyecto en producción que ya funciona.** Tu trabajo es AÑADIR
funcionalidad nueva sin alterar nada de lo que ya existe. Un cambio que rompa
algo existente es peor que no hacer el cambio.

Prefiere siempre añadir código nuevo antes que modificar código existente.

## Archivos que NO debes modificar nunca

- `_redirects` — configuración del proxy de Netlify. Si crees que necesitas
  cambiarlo, para y pregúntame.
- `netso-logo.png` — el logo.
- Cualquier archivo dentro de `apps-script/` — es una copia de respaldo del
  backend que corre en Google, no código de este sitio.

## Código de `index.html` que NO debes modificar

No cambies, reescribas, reordenes, refactorices ni "mejores" ninguna de estas
funciones. Solo puedes leerlas para entender cómo funcionan:

`parseCSV`, `parsePubHtml`, `unwrapGoogle`, `findHeader`, `makeFinder`,
`normalize`, `pdate`, `fmtDate`, `estadoKey`, `loadLive`, `loadFile`,
`loadDemo`, `sheetToMatrixWithLinks`, `renderKPIs`, `renderPipe`,
`renderCharts`, `renderTable`, `renderAlerts`, `refreshOptions`, `fillSelect`,
`applyFilters`, `filters`, `statusUI`.

Tampoco cambies estas constantes ni su contenido:

`SHEET_ID`, `SHEET_NAME`, `SHEET_URL`, `PUB_ID`, `PUB_GID`, `PROXY_HTML`,
`PROXY_CSV`, `STAGES`, `REQUIRED`, `TRACK`.

Si una tarea parece exigir tocar algo de esta lista, **detente y explícame por
qué antes de escribir una sola línea.**

## Prohibiciones explícitas

- No añadas dependencias, ni librerías, ni CDNs nuevos, ni `npm`, ni
  `package.json`, ni build step, ni frameworks. El proyecto es un solo HTML a
  propósito.
- No dividas `index.html` en varios archivos.
- No reformatees, reindentes ni reordenes código existente. Nada de
  "formateo automático" del archivo completo.
- No conviertas funciones existentes a otra sintaxis, ni cambies `var`/`let`,
  ni pases callbacks a async/await en código que ya funciona.
- No renombres variables, funciones, ids de HTML ni clases de CSS existentes.
- No borres comentarios. Los comentarios en español del archivo explican
  decisiones deliberadas; respétalos.
- No toques la lógica que decide el estado de cada etapa (`row.missing`,
  `row.sem`, las clases CSS `.step`, `.ok`, `.lnk`, `.late`, `.na`).
- No "corrijas" datos ni añadas normalización de datos que no te pedí. Las
  anomalías de la hoja (fechas 31/10/1899, espacios sobrantes, estados vacíos)
  se REPORTAN al usuario en el panel de observaciones, no se arreglan solas.
- No escribas en la hoja de Google desde el navegador. La única escritura pasa
  por el backend de Apps Script.

## Estilo

- Reutiliza las variables CSS de `:root` (`--green`, `--blue`, `--line`,
  `--ink`, `--muted`, `--card`, `--bg`, `--red`, `--amber`) y las clases que ya
  existen (`.btn`, `.btn-primary`, `.btn-ghost`, `.panel`, `.fld`). El código
  nuevo debe parecer parte del mismo diseño.
- Comentarios y textos de interfaz en español.
- JavaScript vanilla, mismo estilo compacto del archivo.
- Nada de `localStorage` ni `sessionStorage`.

## Al terminar cualquier tarea

Dime, en una lista corta:

1. Qué añadiste y en qué parte del archivo.
2. Qué funciones existentes modificaste, si alguna, y por qué era inevitable.
3. Cómo puedo comprobar yo mismo que funciona.

Si modificaste algo de las listas de arriba, dilo en la PRIMERA línea de tu
respuesta.

## Permiso permanente · campos y columnas nuevas

Esto no es una excepción de un solo uso: aplica siempre, porque la hoja gana
columnas cada cierto tiempo.

- `normalize` puede añadir la lectura de columnas nuevas y campos nuevos al
  objeto de cada fila. NO puede cambiar la lógica de `stages`, `missing` ni
  `sem`, ni alterar los campos que ya lee.
- `detailHTML` y `timelineHTML` pueden añadir campos y controles nuevos. No
  cambies cómo se pintan las etapas ni sus clases CSS.

Todo lo demás de la lista protegida sigue intocable.

## Excepción autorizada · PENDIENTE · aviso de filas ocultas

El backend ya devuelve un campo `ocultas` con el número de filas que saltó
por estar escondidas en la hoja, sea por un filtro o a mano. El frontend
nunca lo lee. Consecuencia: si alguien deja un filtro puesto en Google
Sheets, el tablero muestra menos cargas de las que hay y no lo dice — los
KPIs, el pipeline y las gráficas reportan de menos en silencio.

Se autoriza añadir **una línea** justo después de cada una de las dos
llamadas existentes a `asignarPendientes(...)`: la de `fetchApi`, dentro de
`loadLive()`, y la de `refrescarDesdeBackend()`. Esa línea antepone un aviso
a `DATA_ALERTS` cuando `data.ocultas` sea mayor que cero.

Son dos sitios y no uno porque `normalize` vacía `DATA_ALERTS` cada vez que
corre: si el aviso solo estuviera en `fetchApi`, desaparecería en silencio
después de cualquier guardado, que es justo cuando más falta hace.

Va antes que los demás avisos a propósito: es el único que dice que los
números que se están viendo están incompletos.

Sigue prohibido tocar el resto de `loadLive`, el cuerpo de `fetchApi` por
lo demás, `fetchSheet`, `updateRows`, `normalize`, `renderAlerts` y el
bloque de error posterior.

## Excepción autorizada · 2026-09-17 · pantalla de entrada con Google

El enlace del tablero es público y el token viaja en el propio `index.html`.
Esta excepción cubre un primer nivel de control de acceso, que es DISUASIÓN,
no seguridad: filtra a quien reciba el enlace por error, pero no a quien lea
el código fuente. El backend sigue aceptando cualquier petición con el token.
Eso se resolverá aparte.

Se autoriza, y solo para esto:

- El script externo `https://accounts.google.com/gsi/client` en el `<head>`.
  Es la única excepción a la prohibición de CDNs nuevos, y solo ese dominio.
- Una constante nueva con las HUELLAS SHA-256 de los correos autorizados, y
  funciones nuevas para la pantalla de entrada.
- Que `loadLive()` solo se llame desde la rama autorizada del portón, nunca
  suelto en el arranque.
- Añadir `class="bloqueado"` al `<body>`, una regla CSS nueva que oculte los
  hijos directos de `.wrap` salvo `#authPanel` mientras esa clase esté
  puesta, y quitarla desde la rama autorizada. Sin esto, quien recibe el
  rechazo sigue viendo el botón "Actualizar", que carga los datos sin pasar
  por el portón.

REGLA CRÍTICA sobre las huellas: la constante contiene huellas y NADA MÁS.
Está prohibido escribir el correo al lado de su huella, ni en un comentario,
ni en el nombre de una variable, ni en ningún otro sitio del archivo. El
`index.html` es público; poner la leyenda anularía el motivo de usar huellas.

Ampliación del 2026-09-22: se autoriza pedir los datos al backend en cuanto
carga la página, en paralelo con el inicio de sesión, y pintarlos solo si el
correo resulta autorizado. El backend tarda unos 6 s fijos, y esperar a que el
usuario haga clic antes de empezar a pedirlos duplicaba la espera. Esto no
cambia nada en seguridad: el token ya viaja en el `index.html` público, así que
cualquiera puede hacer esa misma petición sin pasar por el portón. Lo que el
portón decide es qué se PINTA, no qué se pide.

Sigue prohibido: `localStorage` y `sessionStorage` — Google mantiene la
sesión de su lado y aquí no se guarda nada. Tocar el cuerpo de `loadLive`,
`normalize`, `renderTable`, `detailHTML`, `btnReload` y el resto de la lista
protegida. Tocar el contenido del HEADER, los KPIs, los filtros, la tabla y
los modales. Añadir cualquier otro CDN. Y tocar `BACKENDS` o el token.

## Excepción autorizada · 2026-09-22 · el botón de editar sale del PI

El botón "Editar datos" vive dentro de `timelineHTML`, colgado de la etapa PI,
porque cuando se hizo solo editaba datos del PI. Hoy ese mismo formulario cubre
proveedor, términos, observaciones, comprobantes, pagos pendientes y los cuatro
campos logísticos. Su sitio actual miente: parece que edita el documento PI, no
la carga.

Se autoriza, y solo para esto:

- `timelineHTML`: eliminar el bloque `if (st.key === "pi" && r.id) { ... }` que
  añade ese botón. Es la única eliminación autorizada. El botón de subir, el
  lápiz del número de documento y todo lo demás de la función se quedan igual.
- `detailHTML`: añadir, como primer hijo del `<div class="dwrap">` y antes de la
  llamada a `timelineHTML(r)`, una barra con ese mismo botón alineado a la
  derecha, con las clases `.btn` y `.btn-ghost` que ya existen.
- Cambiar el texto del botón a "Editar datos de la carga", y el título del modal
  de "Datos del PI" a "Datos de la carga".

Sigue prohibido tocar cómo se pintan las etapas y sus clases CSS, el resto de
`detailHTML`, `renderTable`, `normalize` y el resto de la lista protegida.

## Excepción autorizada · 2026-09-22 · se retira "Subir Excel"

La subida manual de un .xlsx era el respaldo de la época en que el dashboard
todavía no hablaba con el backend. Hoy los datos llegan por la API, con la hoja
publicada en HTML y en CSV como respaldo, y esa vía no se usa. Mientras tanto
obliga a descargar `xlsx.full.min.js` —unos 900 KB, y bloqueante— en cada
visita, aunque nadie vaya a subir nada.

Se autoriza, y solo para esto:

- Eliminar el script externo de `xlsx` del `<head>`.
- Eliminar el botón `btnUpload` y el `<input type="file" id="fileInput">` del
  HEADER, junto con las dos líneas de eventos que los conectan.
- Eliminar completas las funciones protegidas `loadFile` y
  `sheetToMatrixWithLinks`. Se quedan sin un solo llamador; borrarlas es más
  seguro que dejarlas como código muerto que apunta a un botón inexistente.
- Reescribir los tres textos que mandan al usuario a pulsar "Subir Excel": los
  dos del bloque de error de `loadLive` y el de `loadDemo`. Solo el texto; la
  lógica de esos bloques no se toca.

Sigue prohibido tocar `normalize`, `parseCSV`, `parsePubHtml`, `renderAll`, el
resto de `loadLive` y de `loadDemo`, y la lista protegida en general. Los dos
respaldos de lectura que quedan —la hoja publicada en HTML y en CSV— no se
tocan: son los que sostienen el dashboard si la API falla.

## Historial

Las excepciones ya ejecutadas y en producción se movieron a
`EXCEPCIONES-HISTORICAS.md`, en la raíz del repositorio. Están ahí solo como
explicación de por qué el código protegido tiene la forma que tiene; no
autorizan nada.

Cualquier modificación a la lista de funciones y constantes protegidas que no
esté autorizada arriba sigue prohibida. Si una tarea parece exigirla,
detente y pregunta antes de escribir una sola línea.
