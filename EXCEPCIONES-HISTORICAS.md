# Excepciones históricas · Control de Cargas Netso

Archivo de consulta, NO es una regla activa. Vive fuera de `.agents/rules/`
a propósito: Antigravity no debe leerlo como permiso.

Cada bloque de abajo autorizó en su momento un cambio concreto sobre código
protegido. Ese cambio ya está hecho, probado y en producción, así que el
permiso ya no hace falta: el código existe y vuelve a estar protegido como
todo lo demás. Se guardan aquí porque explican POR QUÉ el código protegido
tiene la forma que tiene.

Se movieron aquí el 2026-09-17, cuando el archivo de reglas pasó del límite
de caracteres que admite el editor de Antigravity (12.000).

---

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

## Excepción autorizada · 2026-08-20 · Subtotal y Flete en el detalle

El panel de detalle muestra `Total`, que en la hoja es la fórmula
`=Subtotal+Flete`, pero no muestra ninguno de sus dos sumandos. `Subtotal`
ya lo lee `normalize`; `Flete` no se lee en ninguna parte del frontend.

Se autoriza:

- `normalize`: añadir `flete: find(["Flete"])` al objeto `col`, y
  `flete: get(r, col.flete)` al objeto de cada fila. Nada más. No se toca
  la lógica de `stages`, `missing` ni `sem`, ni ningún campo existente.
- `detailHTML`: añadir dos líneas `kv` —`Subtotal` y `Flete`—
  inmediatamente ANTES de la línea `${kv("Total", esc(r.total))}` que ya
  existe, con la misma forma que las demás.

Sigue prohibido tocar el resto de `detailHTML` (el bloque `estCtrl`, el
condicional de `r.tienePlanPagos`, las listas de pendientes y
comprobantes), `timelineHTML`, `renderTable`, y el resto de `normalize`.

No se añaden columnas a la hoja: `Subtotal` y `Flete` ya existen.

---

Archivadas el 2026-09-22, segunda tanda: autenticación con Google,
aviso de filas ocultas, el botón de editar fuera del PI y la retirada de
"Subir Excel". Todas ejecutadas y en producción.

---

## Excepción autorizada · 2026-08-20 · aviso de filas ocultas

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

---

Archivadas el 2026-09-25: la columna Buque y la retirada de los filtros de
agente y buque. Las dos ejecutadas y en producción.

---

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
