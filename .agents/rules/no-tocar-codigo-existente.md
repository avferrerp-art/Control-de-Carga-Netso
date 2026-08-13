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

## Excepciones autorizadas (Fase 2)

Estas y solo estas modificaciones a código protegido están permitidas:

- `estadoKey`: añadir el reconocimiento del estado "En espera de despacho"
  devolviendo la clave `espera`. No cambies el reconocimiento de ningún otro
  estado.
- `REQUIRED`: añadir la entrada `espera: ["pi","inv","pl"]`. No modifiques
  ninguna de las entradas que ya existen.
- `normalize`: puede llamar a la función auxiliar de recálculo ya existente.
  Nada más.
- `timelineHTML` y `detailHTML`: pueden añadir controles nuevos. No cambies
  cómo se pintan las etapas ni sus clases CSS.

Cualquier otra modificación a la lista de funciones y constantes protegidas
sigue prohibida. Si una tarea parece exigirla, detente y pregunta.