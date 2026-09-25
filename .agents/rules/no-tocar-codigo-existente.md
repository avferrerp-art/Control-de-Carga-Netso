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

## Excepción autorizada · 2026-09-23 · Buque

El agente aduanal ocupa una columna de la tabla, pero en el día a día lo que se
mira para saber dónde va una carga es el buque. El agente no se va a ninguna
parte: sigue en la hoja, en el panel desplegado, en el modal y en su propio
filtro. Lo único que cambia es quién ocupa esa columna de la tabla.

Se autoriza, y solo para esto:

- `renderTable`: sustituir el contenido de la ÚLTIMA celda de la fila, hoy
  `${esc(r.agente) || "—"}`, por el buque. Una línea. No se tocan `data-i`,
  `tr.onclick`, el `colspan` ni ninguna otra celda.
- `filters`: añadir una entrada `buque` al objeto que devuelve.
- `applyFilters`: añadir una línea que descarte las filas que no coincidan, con
  la misma forma que las tres que ya están, y añadir `r.buque` a la lista de
  campos donde busca el cuadro de texto.
- `refreshOptions`: añadir una llamada más a `fillSelect`, para el desplegable
  nuevo.

Leer la columna en `normalize` y mostrar el campo en `detailHTML` no necesitan
excepción: los cubre el permiso permanente de más arriba.

Sigue prohibido tocar el resto de esas cuatro funciones, `normalize` más allá
de leer la columna nueva, `renderKPIs`, `renderPipe`, `renderCharts`, y el resto
de la lista protegida.

## Excepción autorizada · 2026-09-23 · fuera los filtros de agente y buque

La barra de filtros se llenó. En el uso real solo se filtra por estado y por
proveedor; los desplegables de agente aduanal y de buque ocupan sitio y no se
usan. Se quitan los dos. No se pierde nada: el cuadro de búsqueda sigue
encontrando por ambos campos, porque siguen en su lista de campos.

Se autoriza, y solo para esto:

- Eliminar del HTML los dos `<div class="fld">` de `fAgente` y `fBuque`.
- `filters`: eliminar las entradas `agente` y `buque` del objeto que devuelve.
- `applyFilters`: eliminar las dos líneas que descartan por esos campos. La
  línea del buscador de texto NO se toca: `r.agente` y `r.buque` se quedan ahí.
- `refreshOptions`: eliminar las dos llamadas a `fillSelect` de esos
  desplegables.
- Quitar `"fAgente"` y `"fBuque"` de los tres arrays de ids.

Los campos siguen leyéndose en `normalize`, mostrándose en `detailHTML` y
editándose desde el modal. Esto solo retira dos controles de la barra de
filtros.

Sigue prohibido tocar el resto de esas funciones, el filtro de estado, el de
proveedor, el del pipeline, y el resto de la lista protegida.

## Excepción autorizada · 2026-09-25 · tabla nueva con Contenido y ETA

La tabla muestra hoy el contenedor, que en el día a día no se mira, y no muestra
ni qué trae la carga ni cuándo llega. Las dos cosas que más se consultan. Se
reordena la fila entera para que las ocho columnas sean, de izquierda a derecha:

    ID · Proveedor · PI No · Ruta documental · Buque · Contenido · ETA · Estado

El contenedor no desaparece del dashboard: sigue en el panel desplegado y en el
modal de editar, que es donde se escribe.

Se autoriza, y solo para esto:

- `renderTable`: reescribir las celdas `<td>` de la fila principal para que sean
  esas ocho, en ese orden. Se pueden llamar a las funciones nuevas
  `contenidoCelda` y `etaCelda`.
- `renderTable`: cambiar los dos `colspan="7"` que tiene dentro por `"8"`.
- Cambiar los `<th>` de la cabecera en el HTML y el `colspan="7"` de la fila de
  "Cargando datos…".

PROHIBIDO dentro de `renderTable`, aunque esté abierta: tocar el atributo
`data-i="${r.i}"` del `<tr>`, el manejador `tr.onclick` que lee `+tr.dataset.i`,
y la primera celda con su `<span class="flag">`. Esa llave numérica es la que
despliega las filas; ya se explicó al cambiar el `#` por el ID y sigue igual de
frágil.

`contenidoCelda`, `etaCelda` y sus reglas CSS son CÓDIGO NUEVO y van fuera de
cualquier función protegida.

Reglas de la celda de ETA, para que no se reinventen: 3 días o menos punto rojo;
de 4 a 10 punto ámbar; más de 10 sin punto; vencida solo la fecha; carga en
estado Recibido solo la fecha en gris. Fecha en formato dd/mm/yyyy, como el
resto del dashboard.

Sigue prohibido tocar `normalize`, `renderKPIs`, `renderPipe`, `renderCharts`,
`applyFilters`, `filters`, `refreshOptions`, `detailHTML`, `timelineHTML` y el
resto de la lista protegida.

## Excepción autorizada · 2026-09-25 · pestañas y barra de filtros única

Las cuatro gráficas se meten entre los filtros y la tabla, que es lo que de
verdad se consulta a diario. Se separan en su propia pestaña. Los filtros no se
duplican: se suben por encima de las pestañas, en una sola barra que sirve a la
tabla y a las gráficas a la vez. Duplicarlos y sincronizarlos sería más código y
una fuente de fallos silenciosos.

El orden nuevo de `.wrap` queda así:

    authPanel · HEADER · KPIs · FILTROS · pestañas
      pestaña Cargas:   TABLA · ALERTAS · PIPELINE
      pestaña Gráficas: CHARTS

Los KPIs quedan fuera de las pestañas a propósito: son el resumen de todo y ya
respetan los filtros, así que sirven igual mirando la tabla o las gráficas.

El pipeline baja al final del todo y se vuelve plegable, cerrado por defecto: se
usa poco y ocupaba el sitio entre los filtros y la tabla. Al cerrarlo se limpia
`PIPE_FILTER`, porque si no la tabla quedaría filtrada por una etapa que ya no
está a la vista. `renderPipe` no se modifica: solo se pliega y se mueve el HTML
que lo contiene, conservando el `<div id="pipe">` donde escribe.

Se autoriza, y solo para esto:

- **Mover dos bloques de HTML existentes**, lo que incluye reindentarlos: el de
  FILTROS sube antes de KPIs, y el de CHARTS baja al final, dentro de su
  pestaña. Es la única excepción a la prohibición de reordenar código.
- Envolver los bloques en dos contenedores nuevos, `#tabCargas` y
  `#tabGraficas`, y añadir la barra de pestañas y su CSS.
- Llamar a `renderCharts(applyFilters(ROWS))` al mostrar la pestaña de gráficas.
  Chart.js mide el ancho del canvas al dibujar, y mientras la pestaña está
  oculta ese ancho es cero: sin este redibujado las gráficas salen diminutas o
  en blanco la primera vez que se abre la pestaña. No se modifica ni una línea
  de `renderCharts`, solo se la llama.

Los dos contenedores tienen que ser **hijos directos de `.wrap`**, o la regla
`body.bloqueado .wrap > *:not(#authPanel)` del portón de acceso dejaría de
ocultarlos y el tablero se vería sin iniciar sesión.

Sigue prohibido modificar el contenido de los bloques movidos, `renderCharts`,
`renderKPIs`, `renderPipe`, `renderTable`, `applyFilters`, `filters`,
`refreshOptions` y el resto de la lista protegida.

## Historial

Las excepciones ya ejecutadas y en producción se movieron a
`EXCEPCIONES-HISTORICAS.md`, en la raíz del repositorio. Están ahí solo como
explicación de por qué el código protegido tiene la forma que tiene; no
autorizan nada.

Cualquier modificación a la lista de funciones y constantes protegidas que no
esté autorizada arriba sigue prohibida. Si una tarea parece exigirla,
detente y pregunta antes de escribir una sola línea.
