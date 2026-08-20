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

- `estadoKey`: añadir el reconocimiento de los estados "En espera de despacho"
  (clave `espera`) y "En cotización" (clave `cotizacion`, buscando "cotiz" para
  que funcione con o sin tilde). No cambies el reconocimiento de ningún otro
  estado.
- `REQUIRED`: añadir las entradas `espera: ["pi","inv","pl"]` y
  `cotizacion: []` (lista vacía a propósito: en esa fase no se exige ningún
  documento). No modifiques ninguna de las entradas que ya existen.
- `stateTag`: añadir al mapa de clases las claves `espera` y `cotizacion`,
  conservando todas las existentes.
- `normalize`: puede llamar a la función auxiliar de recálculo, y puede añadir
  la lectura de columnas nuevas y campos nuevos al objeto de cada fila. NO
  puede cambiar la lógica de `stages`, `missing` ni `sem`, ni alterar los
  campos que ya lee.
- `timelineHTML` y `detailHTML`: pueden añadir controles y campos nuevos. No
  cambies cómo se pintan las etapas ni sus clases CSS.
- `loadLive`: además de añadir intentos, puede reordenar la secuencia de
  lectura y lanzar varias fuentes en paralelo, siempre que se conserven TODAS
  las fuentes existentes como respaldo.

## Excepción autorizada · 2026-08-17

Se autoriza modificar **una única línea** dentro de `loadLive()`: la que
lanza `Promise.all([fetchApi(), fetchSheet()])`. El objetivo es que la hoja
publicada solo se consulte cuando la API falla, para eliminar el pintado
con datos cacheados.

Sigue prohibido tocar el cuerpo de `fetchApi`, el de `fetchSheet`,
`updateRows`, y el bloque de error posterior.

## Excepción autorizada · 2026-08-18 · estado pulsable

Se autoriza sustituir, dentro de `detailHTML()`, el bloque que construye
`estCtrl` (el badge más el `<select>` de estado) por un único control: un
`<select>` con las clases `.st` que ya existen, de modo que el propio badge
sea el desplegable.

Se autoriza añadir reglas CSS nuevas para `select.st` y una constante nueva
`ESTADOS_VALIDOS`.

Sigue prohibido tocar `stateTag`, `cambiarEstado`, `renderTable`, y las
clases CSS `.st.*` existentes y sus colores.

## Excepción autorizada · 2026-08-18 · lista de comprobantes

Se autoriza sustituir, dentro de `detailHTML()`, el bloque que pinta la
lista de comprobantes de pago por una llamada a la función nueva
`listaComprobantesHTML(pagos)`, y hacer lo mismo en los dos puntos del
modal del PI donde se rellena `piComprobantesList`.

El objetivo es que las tres listas dejen de estar duplicadas y muestren
también el concepto del pago.

Sigue prohibido tocar el resto de `detailHTML`, `timelineHTML`,
`normalize`, `fmtDate` y `pdate`.

## Excepción autorizada · 2026-08-18 · pagos pendientes

Se autoriza añadir UNA línea dentro de `loadLive()`, en la función interna
`fetchApi`, justo después de la llamada existente a `asignarPagos(...)`,
para repartir también los pagos pendientes entre las filas.

Se autoriza añadir dentro de `detailHTML()` un bloque nuevo "PAGOS
PENDIENTES" encima del de comprobantes.

Sigue prohibido tocar el resto de `loadLive`, `normalize`, `renderTable`
y `applyFilters`.

## Excepción autorizada · 2026-08-18 · modelo de pagos

Se autoriza que `normalize` lea tres columnas nuevas —`Pagado`,
`Programado` y `Sin programar`— y las añada al objeto de cada fila.

Se autoriza sustituir, dentro de `detailHTML()`, las dos líneas que
pintan "Anticipo" y "Por Pagar" por una condición que muestre esos dos
campos cuando la carga NO tiene plan de pagos, y los tres nuevos cuando
sí lo tiene.

Sigue prohibido tocar la lógica de `stages`, `missing` y `sem` de
`normalize`, y el resto de `detailHTML`.

## Excepción autorizada · 2026-08-19 · filtros múltiples

Se autoriza modificar estas cuatro funciones protegidas, y solo para esto:

- `filters`: devolver un array por cada filtro en vez de un valor único,
  leyendo las opciones seleccionadas de un desplegable múltiple.
- `applyFilters`: comparar contra esos arrays, y aceptar un segundo
  parámetro opcional `ignorarPipe` que omite el filtro del pipeline.
- `fillSelect` y `refreshOptions`: rellenar desplegables múltiples
  conservando la selección, y sin opción "Todos".

Se autoriza además modificar el HTML de los tres desplegables de filtro,
añadir reglas CSS para `select[multiple]`, y cambiar el manejador de
"Limpiar filtros" para deseleccionar en vez de vaciar.

Sigue prohibido tocar `normalize`, `renderTable`, `renderKPIs`,
`renderPipe`, `renderCharts`, `detailHTML` y `timelineHTML`.

Cualquier otra modificación a la lista de funciones y constantes protegidas
sigue prohibida. Si una tarea parece exigirla, detente y pregunta.

## Excepción autorizada · 2026-08-19 · estados que faltan en la dona

Cuando se añadieron los estados "En espera de despacho" (clave `espera`) y
"En cotización" (clave `cotizacion`) se actualizaron `estadoKey`, `REQUIRED`
y `stateTag`, pero se quedaron fuera de dos sitios. La consecuencia es que
una carga en cualquiera de esos dos estados **no aparece en la gráfica de
estados**: no se cuenta en ninguna porción, desaparece sin aviso.

Se autoriza, y solo para tapar ese hueco:

- `ESTADO_LABEL`: añadir las claves `espera: "En espera de despacho"` y
  `cotizacion: "En cotización"`. No cambies ninguna de las seis que ya
  existen.
- `renderCharts`: añadir `"espera"` y `"cotizacion"` **al final** del array
  `order`, y sus dos colores **al final** del array `cols`, dentro del
  bloque "1. Estado". Los dos arrays van emparejados por índice: añadir al
  final es obligatorio para que ningún estado existente cambie de color.

Sigue prohibido reordenar `order` o `cols`, cambiar cualquiera de los seis
colores que ya están, y tocar los bloques "2. Proveedores" y "3. Meses" de
`renderCharts`, además de todo lo demás de la lista protegida.

## Excepción autorizada · 2026-08-20 · aviso de filas ocultas

El backend ya devuelve un campo `ocultas` con el número de filas que saltó
por estar escondidas en la hoja, sea por un filtro o a mano. El frontend
nunca lo lee. Consecuencia: si alguien deja un filtro puesto en Google
Sheets, el tablero muestra menos cargas de las que hay y no lo dice — los
KPIs, el pipeline y las gráficas reportan de menos en silencio.

Se autoriza añadir **una sola línea** dentro de `loadLive()`, en la función
interna `fetchApi`, justo después de la llamada existente a
`asignarPendientes(...)`, que anteponga un aviso a `DATA_ALERTS` cuando
`data.ocultas` sea mayor que cero.

Va antes que los demás avisos a propósito: es el único que dice que los
números que se están viendo están incompletos.

Sigue prohibido tocar el resto de `loadLive`, el cuerpo de `fetchApi` por
lo demás, `fetchSheet`, `updateRows`, `normalize`, `renderAlerts` y el
bloque de error posterior.

## Excepción autorizada · 2026-08-20 · montos en los tooltips

Las gráficas siguen midiendo CANTIDAD DE CARGAS. No cambia ni un color, ni
un eje, ni un título, ni el tipo de gráfica. Lo único que cambia es lo que
dice el globito al pasar el ratón: además de las cargas, muestra la suma de
la columna `Total` de esa categoría, y cuántas de esas cargas todavía no
tienen monto cargado.

Ese último dato no es opcional. Hoy 13 de 88 cargas tienen `Total` a
`$0,00` porque su `Subtotal` y su `Flete` están vacíos: no valen cero, es
que no se sabe cuánto valen. Sumarlas como cero sin decirlo convertiría el
tooltip en un número falso. Se reporta la anomalía, no se corrige — igual
que con las fechas 31/10/1899 y las cargas sin Status.

Se autoriza modificar `renderCharts`, y solo así:

- En los bloques "1. Estado", "2. Proveedores" y "3. Evolución mensual":
  calcular, junto a los conteos que ya se calculan, la suma de montos por
  categoría y el número de cargas con monto cero, usando la función nueva
  `montoANumero`.
- En esos mismos tres bloques: añadir un `tooltip` con su `callbacks.label`
  dentro del `plugins` que ya existe en `options`.

Sigue prohibido cambiar `type`, `data.labels`, los valores de
`datasets[].data`, `backgroundColor`, `borderRadius`, `scales`, `cutout`,
`indexAxis` y la configuración de `legend`. El bloque "4. Completitud" no
se toca en absoluto. El orden del top 10 de proveedores se sigue
calculando por cantidad de cargas, nunca por monto.

Las funciones auxiliares `montoANumero`, `fmtMonto` y `lineasTooltip` son
CÓDIGO NUEVO y se añaden fuera de cualquier función protegida.

`montoANumero` debe replicar exactamente la lógica de `parsearMonto` del
backend de Apps Script: si el texto tiene punto Y coma, el ÚLTIMO de los
dos es el separador decimal; si solo tiene uno, tres dígitos detrás
significa que era separador de miles. El dashboard y el backend tienen que
interpretar los montos igual.

## Excepción autorizada · 2026-08-20 · ID de la hoja en la tabla

La primera columna de la tabla muestra `r.i`, que es la posición de la fila
dentro de lo que se cargó (`out.length + 1`), no un identificador. Con un
filtro activo en la hoja ese número no corresponde a nada. El `ID` de la
columna A (`C-001`) sí es estable y es el que usa todo el backend.

Se autoriza modificar `renderTable`, y solo esto: sustituir el `${r.i}`
que se muestra dentro del primer `<td>` por el ID de la carga, con el
número como respaldo si el ID estuviera vacío.

Se autoriza cambiar el `<th>#</th>` de la cabecera por `<th>ID</th>`.

Sigue PROHIBIDO tocar el atributo `data-i="${r.i}"` del `<tr>`, y el
manejador `tr.onclick` que lee `+tr.dataset.i`. Ese valor es la llave
numérica con la que se despliega la fila y con la que `OPEN_ROW` se
compara en el resto del archivo; cambiarlo al ID lo convertiría en NaN y
las filas dejarían de abrirse. Tampoco se toca el `<span class="flag">`,
ni el resto de celdas, ni `normalize`.
