/**
 * CONTROL DE CARGAS · NETSO
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 0 · Preparación de la hoja
 * Fase 1 · API de lectura y escritura para el dashboard
 *
 * Este archivo reemplaza a fase0-preparar-hoja.gs. Contiene todo.
 *
 * INSTALACIÓN
 *   1. Extensiones → Apps Script
 *   2. Borra el contenido de Código.gs y pega este archivo completo
 *   3. Guarda y recarga el Sheet. Aparece el menú "Netso"
 *   4. Netso → Preparar hoja (Fase 0)      ← si aún no lo hiciste
 *   5. Netso → Configurar API (Fase 1)     ← define la clave y la carpeta
 *   6. Implementar → Nueva implementación → Aplicación web
 *        Ejecutar como:      Yo
 *        Quién tiene acceso: Cualquier usuario
 *   7. Netso → Ver configuración           ← te da la URL para el dashboard
 *
 * SEGURIDAD
 *   El endpoint queda abierto a internet, pero cada llamada exige una clave
 *   que solo tú conoces. La clave se guarda en las propiedades del script,
 *   nunca en el código del dashboard: la escribes al entrar y queda en tu
 *   navegador. Por eso el sitio puede ser público sin exponer nada.
 */

const HOJA = 'Control de cargas';
const VERSION = '1.0';

/** Cada etapa documental: dónde va el número, dónde la fecha, y el prefijo del archivo. */
const ETAPAS = {
  rfq: { col: 'RFQ No',            fecha: 'Fecha RFQ',     pre: 'RFQ'     },
  pi:  { col: 'PI No',             fecha: 'Fecha PI',      pre: 'PI'      },
  inv: { col: 'Link Invoice',      fecha: 'Fecha Invoice', pre: 'INVOICE' },
  pl:  { col: 'Link Packing List', fecha: 'Fecha PL',      pre: 'PL'      },
  bl:  { col: 'BL',                fecha: 'Fecha BL',      pre: 'BL'      },
};

const ESTADOS = [
  'En producción', 'En camino', 'Proc. Nacionalización', 'Recibido', 'Indefinido',
];

const COLUMNAS_NUEVAS = [
  { nombre: 'ID',            formato: null },
  { nombre: 'RFQ No',        formato: null },
  { nombre: 'Fecha RFQ',     formato: 'dd/MM/yyyy' },
  { nombre: 'Fecha PI',      formato: 'dd/MM/yyyy' },
  { nombre: 'Fecha Invoice', formato: 'dd/MM/yyyy' },
  { nombre: 'Fecha PL',      formato: 'dd/MM/yyyy' },
  { nombre: 'Fecha BL',      formato: 'dd/MM/yyyy' },
];

/** Tope por archivo. Más allá de esto Apps Script se vuelve inestable. */
const MAX_MB = 15;

/* ══════════════════════════════════════════════════════════════════════════
   MENÚ
   ══════════════════════════════════════════════════════════════════════════ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Netso')
    .addItem('Preparar hoja (Fase 0)', 'prepararHoja')
    .addItem('Ver diagnóstico', 'diagnosticar')
    .addSeparator()
    .addItem('Configurar API (Fase 1)', 'configurar')
    .addItem('Ver configuración', 'verConfiguracion')
    .addItem('Probar API', 'probarApi')
    .addToUi();
}

/* ══════════════════════════════════════════════════════════════════════════
   FASE 1 · CONFIGURACIÓN
   ══════════════════════════════════════════════════════════════════════════ */

function configurar() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const r1 = ui.prompt(
    'Clave de acceso',
    'Escribe la clave que usarás en el dashboard.\n' +
    'Mínimo 12 caracteres. Anótala: no se puede recuperar, solo reemplazar.',
    ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const clave = r1.getResponseText().trim();
  if (clave.length < 12) { ui.alert('La clave debe tener al menos 12 caracteres.'); return; }

  const r2 = ui.prompt(
    'Carpeta de Drive',
    'Pega el ID de la carpeta donde se guardarán los documentos.\n' +
    'El ID es la parte final de la URL cuando abres la carpeta.\n\n' +
    'Si lo dejas vacío, se crea una carpeta nueva llamada CONTROL DE CARGAS.',
    ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;

  let carpetaId = r2.getResponseText().trim();
  let nombre;
  if (carpetaId) {
    try { nombre = DriveApp.getFolderById(carpetaId).getName(); }
    catch (e) { ui.alert('No pude abrir esa carpeta. Revisa el ID.'); return; }
  } else {
    const f = DriveApp.createFolder('CONTROL DE CARGAS');
    carpetaId = f.getId();
    nombre = f.getName();
  }

  props.setProperty('CLAVE', clave);
  props.setProperty('CARPETA_RAIZ', carpetaId);

  ui.alert('Configuración guardada',
    'Clave: ' + clave.charAt(0) + '•'.repeat(clave.length - 2) + clave.charAt(clave.length - 1) +
    '\nCarpeta: ' + nombre +
    '\n\nAhora implementa el script como aplicación web:\n' +
    'Implementar → Nueva implementación → Aplicación web\n' +
    '  Ejecutar como: Yo\n' +
    '  Acceso: Cualquier usuario',
    ui.ButtonSet.OK);
}

function verConfiguracion() {
  const props = PropertiesService.getScriptProperties();
  const clave = props.getProperty('CLAVE');
  const raiz = props.getProperty('CARPETA_RAIZ');
  let url = '(sin implementar todavía)';
  try { url = ScriptApp.getService().getUrl() || url; } catch (e) {}

  let carpeta = '(sin configurar)';
  if (raiz) { try { carpeta = DriveApp.getFolderById(raiz).getName(); } catch (e) { carpeta = '(ID inválido)'; } }

  const msg = [
    'Versión del script: ' + VERSION,
    'Clave configurada: ' + (clave ? 'sí (' + clave.length + ' caracteres)' : 'NO'),
    'Carpeta de Drive: ' + carpeta,
    '',
    'URL para el dashboard:',
    url,
  ].join('\n');

  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Configuración', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return msg;
}

/* ══════════════════════════════════════════════════════════════════════════
   FASE 1 · API
   ═══════════════════════════════════════════════════════════

   El dashboard envía POST con Content-Type text/plain y el JSON en el cuerpo.
   No es un descuido: si se enviara como application/json el navegador haría
   primero una petición OPTIONS de verificación, y Apps Script no sabe
   responderla. Con text/plain el navegador la envía directo.
   ══════════════════════════════════════════════════════════════════════════ */

function doPost(e) {
  return _responder(function () {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return _manejar(body);
  });
}

function doGet(e) {
  return _responder(function () {
    return _manejar((e && e.parameter) || {});
  });
}

function _responder(fn) {
  let out;
  try {
    out = { ok: true, datos: fn() };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function _manejar(p) {
  const claveOk = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!claveOk) throw new Error('El script no tiene clave configurada. Menú Netso → Configurar API.');
  if (String(p.clave || '') !== claveOk) throw new Error('Clave incorrecta.');

  switch (String(p.accion || '')) {
    case 'ping':           return _ping();
    case 'leer':           return _leer();
    case 'subirDoc':       return _conBloqueo(function () { return _subirDoc(p); });
    case 'cambiarEstado':  return _conBloqueo(function () { return _cambiarEstado(p); });
    case 'guardarCarga':   return _conBloqueo(function () { return _guardarCarga(p); });
    default: throw new Error('Acción desconocida: ' + p.accion);
  }
}

/** Toda escritura pasa por aquí: evita que dos cambios simultáneos se pisen. */
function _conBloqueo(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('La hoja está ocupada. Intenta de nuevo en unos segundos.');
  try {
    const r = fn();
    SpreadsheetApp.flush();
    return r;
  } finally {
    lock.releaseLock();
  }
}

function _ping() {
  const sh = _hoja();
  return { version: VERSION, hoja: sh.getName(), filas: _filasConDatos(sh, _indice(_encabezados(sh))).length };
}

/**
 * Devuelve la hoja como matriz de textos + matriz de hipervínculos, con la
 * misma forma que el dashboard ya sabe interpretar. La fila 0 es la de
 * encabezados.
 */
function _leer() {
  const sh = _hoja();
  const nCols = sh.getLastColumn();
  const nFilas = sh.getLastRow();
  if (nFilas < 1) return { matriz: [], links: [] };

  const rango = sh.getRange(1, 1, nFilas, nCols);
  const textos = rango.getDisplayValues();
  const rich = rango.getRichTextValues();

  const links = rich.map(function (fila) {
    return fila.map(function (rt) { return _linkDeCelda(rt); });
  });

  return { matriz: textos, links: links, filas: nFilas - 1, columnas: nCols };
}

/**
 * Saca el hipervínculo de una celda. Puede estar puesto sobre la celda entera
 * o sobre un tramo del texto; se revisan las dos formas.
 */
function _linkDeCelda(rt) {
  if (!rt) return '';
  const directo = rt.getLinkUrl();
  if (directo) return directo;
  const runs = rt.getRuns ? rt.getRuns() : [];
  for (let i = 0; i < runs.length; i++) {
    const u = runs[i].getLinkUrl();
    if (u) return u;
  }
  return '';
}

/**
 * Sube un documento a Drive y lo deja enlazado en la celda que corresponde.
 * Espera: { id, etapa, numero, fecha?, nombreArchivo, mime, datos (base64) }
 */
function _subirDoc(p) {
  const etapa = ETAPAS[String(p.etapa || '').toLowerCase()];
  if (!etapa) throw new Error('Etapa inválida: ' + p.etapa + '. Válidas: ' + Object.keys(ETAPAS).join(', '));
  if (!p.datos) throw new Error('No llegó el archivo.');

  const sh = _hoja();
  const idx = _indice(_encabezados(sh));
  const fila = _buscarFila(sh, idx, p.id);

  const bytes = Utilities.base64Decode(p.datos);
  const mb = bytes.length / 1048576;
  if (mb > MAX_MB) throw new Error('El archivo pesa ' + mb.toFixed(1) + ' MB. El máximo es ' + MAX_MB + ' MB.');

  const numero = String(p.numero || '').trim() || etapa.pre + '-' + p.id;
  const ext = _extension(p.nombreArchivo);
  const nombre = etapa.pre + '_' + _limpiarNombre(numero) + ext;

  const carpeta = _carpetaDeCarga(sh, idx, fila);
  const blob = Utilities.newBlob(bytes, p.mime || 'application/octet-stream', nombre);
  const archivo = carpeta.createFile(blob);
  // No se cambian los permisos a propósito: el archivo hereda los de la
  // carpeta. Hacerlo público con enlace sería un retroceso de privacidad.

  const colNum = _col(idx, etapa.col);
  sh.getRange(fila, colNum).setRichTextValue(
    SpreadsheetApp.newRichTextValue().setText(numero).setLinkUrl(archivo.getUrl()).build());

  const colFecha = idx[etapa.fecha.toLowerCase()];
  if (colFecha !== undefined) {
    const f = p.fecha ? _parsearFecha(p.fecha) : new Date();
    if (f) sh.getRange(fila, colFecha + 1).setValue(f);
  }

  return {
    id: p.id, etapa: p.etapa, fila: fila,
    archivo: nombre, url: archivo.getUrl(),
    carpeta: carpeta.getName(), mb: Number(mb.toFixed(2)),
  };
}

function _cambiarEstado(p) {
  const estado = String(p.estado || '').trim();
  if (ESTADOS.indexOf(estado) < 0) throw new Error('Estado inválido: "' + estado + '". Válidos: ' + ESTADOS.join(', '));

  const sh = _hoja();
  const idx = _indice(_encabezados(sh));
  const fila = _buscarFila(sh, idx, p.id);
  sh.getRange(fila, _col(idx, 'Status')).setValue(estado);
  return { id: p.id, fila: fila, estado: estado };
}

/**
 * Crea o edita una carga. Espera { id?, campos: { "Supplier": "...", ... } }
 * Las claves de campos son nombres de columna tal cual aparecen en la hoja.
 * Sin id, crea una carga nueva al final y le asigna uno.
 */
function _guardarCarga(p) {
  const sh = _hoja();
  const idx = _indice(_encabezados(sh));
  const campos = p.campos || {};
  let fila, id = p.id, creada = false;

  if (id) {
    fila = _buscarFila(sh, idx, id);
  } else {
    fila = sh.getLastRow() + 1;
    // Si la hoja está llena hasta la última fila disponible, hay que crear una
    // más antes de escribir: getRange() falla si se pasa del máximo.
    if (fila > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
    id = _nuevoId();
    sh.getRange(fila, _col(idx, 'ID')).setValue(id);
    creada = true;
  }

  const escritos = [];
  Object.keys(campos).forEach(function (nombre) {
    const c = idx[String(nombre).replace(/\s+/g, ' ').trim().toLowerCase()];
    if (c === undefined) return;                 // columna inexistente: se ignora
    if (nombre.toLowerCase() === 'id') return;   // el ID no se toca nunca
    let v = campos[nombre];
    if (/^fecha|^etd$|^eta$/i.test(nombre)) { const f = _parsearFecha(v); if (f) v = f; }
    sh.getRange(fila, c + 1).setValue(v);
    escritos.push(nombre);
  });

  return { id: id, fila: fila, creada: creada, campos: escritos };
}

/* ══════════════════════════════════════════════════════════════════════════
   DRIVE
   ══════════════════════════════════════════════════════════════════════════ */

function _carpetaRaiz() {
  const id = PropertiesService.getScriptProperties().getProperty('CARPETA_RAIZ');
  if (!id) throw new Error('No hay carpeta configurada. Menú Netso → Configurar API.');
  return DriveApp.getFolderById(id);
}

/** Carpeta de la carga: RAÍZ / año / "PROVEEDOR — PI No". Se crea si no existe. */
function _carpetaDeCarga(sh, idx, fila) {
  const val = function (nombre) {
    const c = idx[nombre.toLowerCase()];
    return c === undefined ? '' : String(sh.getRange(fila, c + 1).getDisplayValue() || '').trim();
  };

  const f = _parsearFecha(val('Fecha PI/INV'));
  const anio = String(f ? f.getFullYear() : new Date().getFullYear());

  const prov = val('Supplier') || 'SIN PROVEEDOR';
  const pi = val('PI No') || val('ID') || 'SIN PI';
  const nombre = _limpiarNombre(prov.toUpperCase() + ' — ' + pi);

  return _subcarpeta(_subcarpeta(_carpetaRaiz(), anio), nombre);
}

function _subcarpeta(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function _limpiarNombre(s) {
  return String(s).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function _extension(nombre) {
  const m = String(nombre || '').match(/(\.[A-Za-z0-9]{1,6})$/);
  return m ? m[1].toLowerCase() : '';
}

/* ══════════════════════════════════════════════════════════════════════════
   PRUEBAS
   ══════════════════════════════════════════════════════════════════════════ */

/** Ejercita la API sin pasar por HTTP. Corre esto antes de tocar el dashboard. */
function probarApi() {
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave) { SpreadsheetApp.getUi().alert('Configura la API primero.'); return; }

  const r = [];
  const ping = _manejar({ clave: clave, accion: 'ping' });
  r.push('ping → versión ' + ping.version + ', ' + ping.filas + ' cargas');

  const leer = _manejar({ clave: clave, accion: 'leer' });
  const conLink = leer.links.reduce(function (a, f) {
    return a + f.filter(function (x) { return x; }).length;
  }, 0);
  r.push('leer → ' + leer.filas + ' filas × ' + leer.columnas + ' columnas, ' + conLink + ' celdas con link');

  const idx = _indice(leer.matriz[0]);
  const colId = idx['id'];
  const primerId = colId === undefined ? null : leer.matriz[1] && leer.matriz[1][colId];
  r.push('primer ID → ' + (primerId || 'NO HAY (¿corriste la Fase 0?)'));

  try { _manejar({ clave: 'incorrecta', accion: 'ping' }); r.push('clave incorrecta → NO la rechazó ✗'); }
  catch (e) { r.push('clave incorrecta → rechazada ✓'); }

  try { _carpetaRaiz(); r.push('carpeta de Drive → accesible ✓'); }
  catch (e) { r.push('carpeta de Drive → ' + e.message); }

  const msg = r.join('\n');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Prueba de API', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return msg;
}

/* ══════════════════════════════════════════════════════════════════════════
   FASE 0 · PREPARACIÓN
   ══════════════════════════════════════════════════════════════════════════ */

function prepararHoja() {
  const sh = _hoja();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('La hoja está ocupada, intenta de nuevo.');
  try {
    const r = [
      _agregarColumnas(sh), _rellenarIds(sh), _normalizarEstados(sh),
      _validarStatus(sh), _limpiarFechasCero(sh), _limpiarEspacios(sh),
    ];
    SpreadsheetApp.flush();
    const msg = r.join('\n');
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert('Fase 0 completada', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return msg;
  } finally { lock.releaseLock(); }
}

function diagnosticar() {
  const sh = _hoja();
  const enc = _encabezados(sh);
  const idx = _indice(enc);
  const datos = _filasConDatos(sh, idx);
  const faltantes = COLUMNAS_NUEVAS.filter(function (c) { return idx[c.nombre.toLowerCase()] === undefined; })
                                   .map(function (c) { return c.nombre; });
  let sinId = 0, ceros = 0;
  const raros = {};
  const colId = idx['id'], colSt = idx['status'], colETD = idx['etd'], colETA = idx['eta'];

  datos.forEach(function (f) {
    if (colId === undefined || !String(f.v[colId] || '').trim()) sinId++;
    if (colSt !== undefined) {
      const can = _canonizarEstado(f.v[colSt]);
      if (can === null || (can !== '' && can !== String(f.v[colSt]).trim())) {
        const k = JSON.stringify(f.v[colSt]);
        raros[k] = (raros[k] || 0) + 1;
      }
    }
    [colETD, colETA].forEach(function (c) { if (c !== undefined && _esFechaCero(f.v[c])) ceros++; });
  });

  const msg = [
    'DIAGNÓSTICO (no se modificó nada)', '',
    'Cargas con datos: ' + datos.length,
    'Columnas por crear: ' + (faltantes.length ? faltantes.join(', ') : 'ninguna'),
    'Cargas sin ID: ' + sinId,
    'Fechas 31/10/1899 por limpiar: ' + ceros,
    'Status por normalizar: ' + (Object.keys(raros).length
      ? Object.keys(raros).map(function (k) { return k + ' ×' + raros[k]; }).join(', ') : 'ninguno'),
  ].join('\n');

  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Diagnóstico', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return msg;
}

function _agregarColumnas(sh) {
  const idx = _indice(_encabezados(sh));
  const nuevas = COLUMNAS_NUEVAS.filter(function (c) { return idx[c.nombre.toLowerCase()] === undefined; });
  if (!nuevas.length) return '1. Columnas: ya estaban todas.';
  let col = sh.getLastColumn();
  nuevas.forEach(function (c) {
    col++;
    if (col > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
    sh.getRange(1, col).setValue(c.nombre).setFontWeight('bold');
    if (c.formato) sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat(c.formato);
  });
  return '1. Columnas creadas: ' + nuevas.map(function (c) { return c.nombre; }).join(', ');
}

function _rellenarIds(sh) {
  const idx = _indice(_encabezados(sh));
  const colId = idx['id'];
  if (colId === undefined) return '2. IDs: no se encontró la columna ID.';
  const datos = _filasConDatos(sh, idx);
  const usados = {};
  datos.forEach(function (f) { const v = String(f.v[colId] || '').trim(); if (v) usados[v] = true; });
  let nuevos = 0;
  datos.forEach(function (f) {
    if (String(f.v[colId] || '').trim()) return;
    let id; do { id = _nuevoId(); } while (usados[id]);
    usados[id] = true;
    sh.getRange(f.fila, colId + 1).setValue(id);
    nuevos++;
  });
  return '2. IDs asignados: ' + nuevos + ' (ya tenían: ' + (datos.length - nuevos) + ')';
}

function _nuevoId() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin I, O, 0, 1
  let s = '';
  for (let i = 0; i < 8; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return 'CG-' + s;
}

function _canonizarEstado(valor) {
  const t = String(valor == null ? '' : valor).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!t) return '';
  if (t.indexOf('recib') >= 0)      return 'Recibido';
  if (t.indexOf('camino') >= 0)     return 'En camino';
  if (t.indexOf('nacionaliz') >= 0) return 'Proc. Nacionalización';
  if (t.indexOf('produc') >= 0)     return 'En producción';
  if (t.indexOf('indefin') >= 0)    return 'Indefinido';
  return null;
}

function _normalizarEstados(sh) {
  const idx = _indice(_encabezados(sh));
  const colSt = idx['status'];
  if (colSt === undefined) return '3. Status: no se encontró la columna.';
  const datos = _filasConDatos(sh, idx);
  let cambiados = 0;
  const desconocidos = {};
  datos.forEach(function (f) {
    const bruto = f.v[colSt];
    const can = _canonizarEstado(bruto);
    if (can === null) { const k = String(bruto).trim(); if (k) desconocidos[k] = (desconocidos[k] || 0) + 1; return; }
    if (can !== '' && can !== String(bruto)) { sh.getRange(f.fila, colSt + 1).setValue(can); cambiados++; }
  });
  let msg = '3. Status normalizados: ' + cambiados;
  const d = Object.keys(desconocidos);
  if (d.length) msg += ' · SIN RECONOCER (se dejaron igual): ' + d.join(', ');
  return msg;
}

function _validarStatus(sh) {
  const idx = _indice(_encabezados(sh));
  const colSt = idx['status'];
  if (colSt === undefined) return '4. Validación: no se encontró Status.';
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS, true).setAllowInvalid(true)
    .setHelpText('Usa uno de los cinco estados de la lista.').build();
  sh.getRange(2, colSt + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(regla);
  return '4. Validación aplicada en Status (' + ESTADOS.length + ' valores).';
}

function _limpiarFechasCero(sh) {
  const enc = _encabezados(sh);
  const idx = _indice(enc);
  const datos = _filasConDatos(sh, idx);
  const cols = [];
  enc.forEach(function (h, i) {
    const t = String(h).trim().toLowerCase();
    if (t === 'etd' || t === 'eta' || t.indexOf('fecha') === 0) cols.push(i);
  });
  let n = 0;
  datos.forEach(function (f) {
    cols.forEach(function (c) { if (_esFechaCero(f.v[c])) { sh.getRange(f.fila, c + 1).clearContent(); n++; } });
  });
  return '5. Fechas 31/10/1899 borradas: ' + n;
}

/**
 * La "fecha cero": una celda vacía guardada como fecha. Aparece de tres formas
 * según cómo se lea la hoja: objeto fecha de 1899, número de serie 0 o negativo
 * (-60 es el 31/10/1899), o el texto 31/10/1899. Solo se aplica a columnas de
 * fecha, así que ningún dato legítimo cae aquí: una fecha real de 2026 es el
 * número 46000 y pico.
 */
function _esFechaCero(v) {
  if (v == null || v === '') return false;
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getFullYear() < 1950;
  if (typeof v === 'number') return v <= 1;
  return /^\s*31[\/\-.]10[\/\-.]1899\s*$/.test(String(v).trim());
}

function _limpiarEspacios(sh) {
  const idx = _indice(_encabezados(sh));
  const cols = ['supplier', 'agente aduanal', 'container id']
    .map(function (n) { return idx[n]; }).filter(function (c) { return c !== undefined; });
  if (!cols.length) return '6. Espacios: no se encontraron columnas de texto.';
  const datos = _filasConDatos(sh, idx);
  let n = 0;
  datos.forEach(function (f) {
    cols.forEach(function (c) {
      const v = f.v[c];
      if (typeof v !== 'string') return;
      const limpio = v.replace(/\s+/g, ' ').trim();
      if (limpio !== v) { sh.getRange(f.fila, c + 1).setValue(limpio); n++; }
    });
  });
  return '6. Celdas con espacios corregidas: ' + n;
}

/* ══════════════════════════════════════════════════════════════════════════
   AYUDANTES
   ══════════════════════════════════════════════════════════════════════════ */

function _hoja() {
  const sh = SpreadsheetApp.getActive().getSheetByName(HOJA);
  if (!sh) {
    const n = SpreadsheetApp.getActive().getSheets().map(function (s) { return s.getName(); }).join(', ');
    throw new Error('No existe la pestaña "' + HOJA + '". Las que hay: ' + n);
  }
  return sh;
}

function _encabezados(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

/** Mapa nombre-de-columna (minúsculas, sin espacios sobrantes) → índice base 0. */
function _indice(enc) {
  const m = {};
  enc.forEach(function (h, i) {
    const k = String(h).replace(/\s+/g, ' ').trim().toLowerCase();
    if (k && m[k] === undefined) m[k] = i;
  });
  return m;
}

/** Índice base 1 de una columna, o error claro si no existe. */
function _col(idx, nombre) {
  const c = idx[String(nombre).toLowerCase()];
  if (c === undefined) throw new Error('Falta la columna "' + nombre + '" en la hoja.');
  return c + 1;
}

/** Ubica una carga por su ID. Nunca por número de fila: las filas se mueven. */
function _buscarFila(sh, idx, id) {
  if (!id) throw new Error('Falta el ID de la carga.');
  const colId = idx['id'];
  if (colId === undefined) throw new Error('La hoja no tiene columna ID. Corre la Fase 0 primero.');
  const ultima = sh.getLastRow();
  if (ultima < 2) throw new Error('La hoja está vacía.');
  const vals = sh.getRange(2, colId + 1, ultima - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === String(id).trim()) return i + 2;
  }
  throw new Error('No se encontró la carga con ID ' + id + '.');
}

function _filasConDatos(sh, idx) {
  const ultima = sh.getLastRow();
  if (ultima < 2) return [];
  const valores = sh.getRange(2, 1, ultima - 1, sh.getLastColumn()).getValues();
  const cols = ['supplier', 'pi no', 'link invoice', 'bl', 'status']
    .map(function (n) { return idx[n]; }).filter(function (c) { return c !== undefined; });
  const out = [];
  valores.forEach(function (v, i) {
    const algo = cols.some(function (c) { return String(v[c] == null ? '' : v[c]).trim() !== ''; });
    if (algo) out.push({ fila: i + 2, v: v });
  });
  return out;
}

function _parsearFecha(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? null : v;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let a = Number(m[3]); if (a < 100) a += 2000;
    const d = new Date(a, Number(m[2]) - 1, Number(m[1]));
    return (isNaN(d) || d.getFullYear() < 1950) ? null : d;
  }
  const d = new Date(s);
  return (isNaN(d) || d.getFullYear() < 1950) ? null : d;
}
