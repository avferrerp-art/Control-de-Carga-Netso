/* ============================================================
   BACKEND v5 · Control de Cargas Netso · HOJA REAL (producción)
   Acciones: subirDoc · guardarDatosPI · cambiarEstado · crearCarga ·
             agregarPago · leer

   CONFIG — edita estas 3 líneas antes de desplegar
   ============================================================ */
const TOKEN      = "netso-prod-4t9w2k7m3x8q";
const FOLDER_ID  = "1M_EZcU-hFNmjfC6xQAjehEcnNS7CuH-F";
const DRY_RUN    = true;          // true = simula, no escribe nada

const SHEET_NAME  = "CONTROL DE CARGAS";
const LOG_SHEET   = "LOG";
const PAGOS_SHEET = "PAGOS";
const BUILD       = "v5";
const ID_HEADER   = "ID";

/* etapa -> columna donde se guarda la URL del documento */
const STAGE_COLUMNS = {
  rfq:    "RFQ URL",
  pi:     "PI URL",
  inv:    "Invoice URL",
  pl:     "PL URL",
  bl:     "BL URL",
  pagoPI: "Pago PI URL",
};

/* Los 7 estados válidos. El backend rechaza cualquier otro. */
const ESTADOS = [
  "En cotización",
  "En produccion",
  "En espera de despacho",
  "En camino",
  "Proc. Nacionalización",
  "Recibido",
  "Indefinido",
];

/* Campos del formulario -> columna de la hoja.
   OJO: solo columnas que se escriben a mano. Total, Total Anticipo y
   Por Pagar son fórmulas y NUNCA se tocan. */
const CAMPOS_PI = {
  subtotal:      "Subtotal",
  anticipoPct:   "Anticipo (%)",   // fracción: 0.2 = 20%
  proveedor:     "Supplier",
  terminos:      "Terminos de credito",
  observaciones: "Observaciones",
  fechaPago:     "Fecha de pago",
};

/* Campos aceptados al crear una carga */
const CAMPOS_NUEVA = {
  proveedor:   "Supplier",
  piNo:        "PI No",
  fecha:       "Fecha PI/INV",
  estado:      "Status",
  agente:      "Agente aduanal",
  contenedor:  "Container ID",
};

const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];
const MAX_BYTES   = 10 * 1024 * 1024;

/* ============================================================
   ENDPOINTS
   ============================================================ */
function doGet(e) {
  return json({ ok: true, build: BUILD, dryRun: DRY_RUN, message: "Backend activo." });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("Sin cuerpo en la petición");
    const p = JSON.parse(e.postData.contents);
    if (p.token !== TOKEN) throw new Error("Token inválido");

    const accion = String(p.accion || "subirDoc");
    switch (accion) {
      case "subirDoc":       return json(conBloqueo(function () { return subirDoc(p); }));
      case "guardarDatosPI": return json(conBloqueo(function () { return guardarDatosPI(p); }));
      case "cambiarEstado":  return json(conBloqueo(function () { return cambiarEstado(p); }));
      case "crearCarga":     return json(conBloqueo(function () { return crearCarga(p); }));
      case "agregarPago":    return json(conBloqueo(function () { return agregarPago(p); }));
      case "leer":           return json(leer());
      default: throw new Error("Acción desconocida: " + accion);
    }
  } catch (err) {
    const msg = String((err && err.message) || err);
    logRow({ accion: "ERROR", detalle: msg });
    return json({ ok: false, error: msg });
  }
}

/* Toda escritura pasa por aquí: si dos personas usan el dashboard a la vez,
   una espera a que la otra termine en vez de pisarla. */
function conBloqueo(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("La hoja está ocupada. Intenta en unos segundos.");
  try {
    const r = fn();
    SpreadsheetApp.flush();
    return r;
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================
   ACCIÓN · subirDoc
   ============================================================ */
function subirDoc(p) {
  const colHeader = STAGE_COLUMNS[p.etapa];
  if (!colHeader) throw new Error("Etapa desconocida: " + p.etapa);
  ["id", "filename", "mimeType", "base64"].forEach(function (k) {
    if (!p[k]) throw new Error("Falta el campo: " + k);
  });

  const ext = (String(p.filename).split(".").pop() || "").toLowerCase();
  if (ALLOWED_EXT.indexOf(ext) === -1) throw new Error("Extensión no permitida: ." + ext);

  const bytes = Utilities.base64Decode(p.base64);
  if (bytes.length > MAX_BYTES) {
    throw new Error("Archivo demasiado grande: " +
      Math.round(bytes.length / 1048576 * 10) / 10 + " MB (máximo 10MB)");
  }

  const ctx = contexto();
  const fila = buscarFila(ctx, p.id);
  const col  = columna(ctx, colHeader);

  // Los documentos SÍ mantienen la regla estricta: no se pisan.
  const actual = String(ctx.sheet.getRange(fila, col).getDisplayValue() || "").trim();
  if (actual !== "") {
    throw new Error("La celda '" + colHeader + "' de esta carga ya tiene un valor. " +
      "Bórrala a mano en el Sheet si quieres reemplazarla.");
  }

  if (DRY_RUN) {
    const msg = "SIMULADO: escribiría en '" + colHeader + "' fila " + fila +
      " (ID " + p.id + ") el archivo '" + p.filename + "'";
    logRow({ accion: "subirDoc", id: p.id, columna: colHeader, nuevo: p.filename, dryRun: true });
    return { dryRun: true, message: msg };
  }

  const blob = Utilities.newBlob(bytes, p.mimeType, p.filename);
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  const url  = file.getUrl();

  ctx.sheet.getRange(fila, col).setValue(url);
  logRow({ accion: "subirDoc", id: p.id, columna: colHeader, anterior: "", nuevo: url });

  return { url: url, fila: fila };
}

/* ============================================================
   ACCIÓN · guardarDatosPI
   Escribe solo los campos que llegan. Los ausentes no se tocan.
   ============================================================ */
function guardarDatosPI(p) {
  if (!p.id) throw new Error("Falta el ID de la carga");
  const ctx  = contexto();
  const fila = buscarFila(ctx, p.id);

  const escritos = [];
  Object.keys(CAMPOS_PI).forEach(function (campo) {
    const v = p[campo];
    if (v === undefined || v === null || v === "") return;   // ausente: no se toca

    const header = CAMPOS_PI[campo];
    const col    = columna(ctx, header);
    let valor    = v;

    if (campo === "fechaPago")    valor = parsearFecha(v) || v;
    if (campo === "anticipoPct")  valor = Number(v);
    if (campo === "subtotal")     valor = Number(v);

    if (campo === "anticipoPct" && (isNaN(valor) || valor < 0 || valor > 1)) {
      throw new Error("El anticipo debe ser una fracción entre 0 y 1 (0.2 = 20%)");
    }

    const anterior = escribirCelda(ctx, fila, col, valor, {
      accion: "guardarDatosPI", id: p.id, columna: header,
    });
    escritos.push({ columna: header, anterior: anterior, nuevo: String(valor) });
  });

  if (!escritos.length) throw new Error("No llegó ningún campo con valor");
  return { fila: fila, dryRun: DRY_RUN, escritos: escritos };
}

/* ============================================================
   ACCIÓN · cambiarEstado
   ============================================================ */
function cambiarEstado(p) {
  if (!p.id) throw new Error("Falta el ID de la carga");
  const estado = String(p.estado || "").trim();
  if (ESTADOS.indexOf(estado) === -1) {
    throw new Error("Estado inválido: '" + estado + "'. Válidos: " + ESTADOS.join(" · "));
  }

  const ctx  = contexto();
  const fila = buscarFila(ctx, p.id);
  const col  = columna(ctx, "Status");

  const anterior = escribirCelda(ctx, fila, col, estado, {
    accion: "cambiarEstado", id: p.id, columna: "Status",
  });

  return { fila: fila, anterior: anterior, nuevo: estado, dryRun: DRY_RUN };
}

/* ============================================================
   ACCIÓN · crearCarga
   Añade una fila al final y copia las fórmulas de la fila anterior.
   ============================================================ */
function crearCarga(p) {
  const ctx = contexto();

  if (p.estado && ESTADOS.indexOf(String(p.estado).trim()) === -1) {
    throw new Error("Estado inválido: '" + p.estado + "'");
  }
  if (!p.proveedor && !p.piNo) throw new Error("Hace falta al menos el proveedor o el PI No");

  const id        = siguienteId(ctx);
  const filaBase  = ctx.sheet.getLastRow();
  const filaNueva = filaBase + 1;
  const nCols     = ctx.sheet.getLastColumn();

  if (DRY_RUN) {
    logRow({ accion: "crearCarga", id: id, columna: "(fila nueva)", nuevo: String(p.proveedor || p.piNo), dryRun: true });
    return { dryRun: true, id: id, fila: filaNueva,
             message: "SIMULADO: crearía la carga " + id + " en la fila " + filaNueva };
  }

  if (filaNueva > ctx.sheet.getMaxRows()) ctx.sheet.insertRowsAfter(ctx.sheet.getMaxRows(), 1);

  // 1) Copiar las fórmulas de la fila anterior. Google traduce las referencias.
  const formulas = ctx.sheet.getRange(filaBase, 1, 1, nCols).getFormulas()[0];
  const copiadas = [];
  for (let c = 0; c < nCols; c++) {
    if (formulas[c]) {
      ctx.sheet.getRange(filaBase, c + 1)
        .copyTo(ctx.sheet.getRange(filaNueva, c + 1), { contentsOnly: false });
      copiadas.push(ctx.headers[c]);
    }
  }

  // 2) Escribir el ID y los campos que llegaron
  ctx.sheet.getRange(filaNueva, columna(ctx, ID_HEADER)).setValue(id);
  const escritos = [];
  Object.keys(CAMPOS_NUEVA).forEach(function (campo) {
    const v = p[campo];
    if (v === undefined || v === null || v === "") return;
    const header = CAMPOS_NUEVA[campo];
    const col = ctx.indice[header.trim().toLowerCase()];
    if (col === undefined) return;               // columna inexistente: se ignora
    let valor = v;
    if (campo === "fecha") valor = parsearFecha(v) || v;
    ctx.sheet.getRange(filaNueva, col + 1).setValue(valor);
    escritos.push(header);
  });

  logRow({ accion: "crearCarga", id: id, columna: "fila " + filaNueva,
           nuevo: escritos.join(", "), detalle: "fórmulas copiadas: " + copiadas.join(", ") });

  return { id: id, fila: filaNueva, escritos: escritos, formulas: copiadas };
}

/* Siguiente ID correlativo: busca el mayor C-### existente y suma 1. */
function siguienteId(ctx) {
  const colId = ctx.indice[ID_HEADER.toLowerCase()];
  if (colId === undefined) throw new Error("No encontré la columna " + ID_HEADER);
  let max = 0;
  for (let r = ctx.headerRow + 1; r < ctx.data.length; r++) {
    const m = String(ctx.data[r][colId] || "").trim().match(/^C-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  let n = String(max + 1);
  while (n.length < 3) n = "0" + n;
  return "C-" + n;
}

/* ============================================================
   PAGOS · una fila por comprobante, sin límite por carga
   ============================================================ */

/* La pestaña de pagos. Se crea sola si no existe. */
function hojaPagos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheets().filter(function (s) {
    return s.getName().trim().toUpperCase() === PAGOS_SHEET.toUpperCase();
  })[0];
  if (!h) {
    h = ss.insertSheet(PAGOS_SHEET);
    h.appendRow(["ID Carga", "Fecha", "Archivo", "URL"]);
  }
  return h;
}

/* Devuelve todos los pagos registrados. El dashboard los reparte por ID. */
function leerPagos() {
  const h = hojaPagos();
  const n = h.getLastRow();
  if (n < 2) return [];
  return h.getRange(2, 1, n - 1, 4).getDisplayValues()
    .filter(function (r) { return String(r[0]).trim() !== ""; })
    .map(function (r) {
      return { id: String(r[0]).trim(), fecha: r[1], archivo: r[2], url: r[3] };
    });
}

/* Sube un comprobante y AÑADE una fila a PAGOS.
   Nunca sobrescribe: una carga puede tener todos los pagos que haga falta. */
function agregarPago(p) {
  if (!p.id) throw new Error("Falta el ID de la carga");
  ["filename", "mimeType", "base64"].forEach(function (k) {
    if (!p[k]) throw new Error("Falta el campo: " + k);
  });

  const ext = (String(p.filename).split(".").pop() || "").toLowerCase();
  if (ALLOWED_EXT.indexOf(ext) === -1) throw new Error("Extensión no permitida: ." + ext);

  const bytes = Utilities.base64Decode(p.base64);
  if (bytes.length > MAX_BYTES) {
    throw new Error("Archivo demasiado grande: " +
      Math.round(bytes.length / 1048576 * 10) / 10 + " MB (máximo 10MB)");
  }

  const ctx = contexto();
  buscarFila(ctx, p.id);            // aborta si la carga no existe
  const fecha = parsearFecha(p.fecha) || new Date();

  if (DRY_RUN) {
    const msg = "SIMULADO: añadiría un pago a " + p.id + " con fecha " +
      Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy");
    logRow({ accion: "agregarPago", id: p.id, columna: PAGOS_SHEET, nuevo: p.filename, dryRun: true });
    return { dryRun: true, message: msg };
  }

  const blob = Utilities.newBlob(bytes, p.mimeType, p.filename);
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  const url  = file.getUrl();

  hojaPagos().appendRow([p.id, fecha, p.filename, url]);
  logRow({ accion: "agregarPago", id: p.id, columna: PAGOS_SHEET, nuevo: p.filename + " · " + url });

  return { url: url, filename: p.filename };
}

/* ============================================================
   ACCIÓN · leer
   Respeta lo que está visible: si hay un filtro activo o filas ocultas
   a mano, esas filas no se envían.
   ============================================================ */
function leer() {
  const ctx = contexto();
  const nF = ctx.sheet.getLastRow(), nC = ctx.sheet.getLastColumn();
  const rango = ctx.sheet.getRange(1, 1, nF, nC);
  const todas = rango.getDisplayValues();
  const rich  = rango.getRichTextValues();

  const linksDe = function (fila) {
    return fila.map(function (rt) {
      if (!rt) return "";
      const d = rt.getLinkUrl();
      if (d) return d;
      const runs = rt.getRuns ? rt.getRuns() : [];
      for (let i = 0; i < runs.length; i++) { const u = runs[i].getLinkUrl(); if (u) return u; }
      return "";
    });
  };

  const matriz = [], links = [];
  let ocultas = 0;

  for (let i = 0; i < todas.length; i++) {
    const filaHoja = i + 1;
    // Los encabezados y lo que hay encima siempre se envían
    if (filaHoja > ctx.headerRow + 1) {
      if (ctx.sheet.isRowHiddenByFilter(filaHoja) || ctx.sheet.isRowHiddenByUser(filaHoja)) {
        ocultas++;
        continue;
      }
    }
    matriz.push(todas[i]);
    links.push(linksDe(rich[i]));
  }

  return { matriz: matriz, links: links, filas: matriz.length - 1,
           columnas: nC, ocultas: ocultas, pagos: leerPagos() };
}

/* ============================================================
   AYUDANTES
   ============================================================ */
function contexto() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets().filter(function (s) {
    return s.getName().trim().toUpperCase() === SHEET_NAME.trim().toUpperCase();
  })[0];
  if (!sheet) throw new Error("No existe la pestaña: " + SHEET_NAME);

  const data = sheet.getDataRange().getValues();
  let headerRow = -1;
  for (let r = 0; r < Math.min(data.length, 10); r++) {
    if (data[r].map(function (c) { return String(c).trim(); }).indexOf(ID_HEADER) !== -1) { headerRow = r; break; }
  }
  if (headerRow === -1) throw new Error("No encontré la fila de encabezados (columna '" + ID_HEADER + "')");

  const headers = data[headerRow].map(function (h) { return String(h).trim(); });
  const indice = {};
  headers.forEach(function (h, i) {
    const k = h.replace(/\s+/g, " ").trim().toLowerCase();
    if (k && indice[k] === undefined) indice[k] = i;
  });

  return { sheet: sheet, data: data, headers: headers, indice: indice, headerRow: headerRow };
}

/** Número de columna (base 1) por nombre de encabezado. Aborta si no existe. */
function columna(ctx, header) {
  const c = ctx.indice[String(header).replace(/\s+/g, " ").trim().toLowerCase()];
  if (c === undefined) throw new Error("No encontré la columna '" + header + "'. Créala en la hoja.");
  return c + 1;
}

function buscarFila(ctx, id) {
  const colId = ctx.indice[ID_HEADER.toLowerCase()];
  if (colId === undefined) throw new Error("No encontré la columna " + ID_HEADER);
  for (let r = ctx.headerRow + 1; r < ctx.data.length; r++) {
    if (String(ctx.data[r][colId]).trim() === String(id).trim()) return r + 1;
  }
  throw new Error("No encontré ninguna carga con ID: " + id);
}

/** Escribe una celda guardando SIEMPRE el valor anterior en el LOG. */
function escribirCelda(ctx, fila, colNum, valor, meta) {
  const rng = ctx.sheet.getRange(fila, colNum);
  const anterior = String(rng.getDisplayValue() || "");
  if (!DRY_RUN) rng.setValue(valor);
  logRow({
    accion: meta.accion, id: meta.id, columna: meta.columna,
    anterior: anterior, nuevo: String(valor), dryRun: DRY_RUN,
  });
  return anterior;
}

function parsearFecha(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === "[object Date]") return isNaN(v) ? null : v;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);              // 2026-08-12 (input date)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/); // 12/08/2026
  if (m) {
    let a = Number(m[3]); if (a < 100) a += 2000;
    const d = new Date(a, Number(m[2]) - 1, Number(m[1]));
    return (isNaN(d) || d.getFullYear() < 1950) ? null : d;
  }
  return null;
}

/* LOG con valor anterior: es lo que permite deshacer cualquier cambio. */
function logRow(o) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName(LOG_SHEET);
    if (!log) {
      log = ss.insertSheet(LOG_SHEET);
      log.appendRow(["Fecha", "Acción", "Dry-run", "ID", "Columna", "Valor anterior", "Valor nuevo", "Detalle"]);
    }
    log.appendRow([new Date(), o.accion || "", !!o.dryRun, o.id || "", o.columna || "",
                   o.anterior || "", o.nuevo || "", o.detalle || ""]);
  } catch (e) { /* si falla el log, no debe tumbar la operación */ }
}

function json(obj) {
  const out = (obj && obj.ok === false) ? obj : Object.assign({ ok: true }, obj || {});
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
