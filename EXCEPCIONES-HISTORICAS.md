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

