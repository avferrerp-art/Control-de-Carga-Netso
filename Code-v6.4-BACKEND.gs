/* ============================================================
   BACKEND · Control de Cargas Netso · v6.4

   COPIA VERSIONADA. Este archivo NO se ejecuta desde aquí: es el
   respaldo del código que corre en Google Apps Script. Sirve para
   recuperarlo si se pierde el acceso al editor, y para poder ver el
   historial de cambios del backend en git.

   Acciones: subirDoc · guardarDatosPI · guardarNumeroDoc ·
             cambiarEstado · crearCarga · agregarPago ·
             crearPendiente · saldarPendiente · borrarPendiente · leer

   ------------------------------------------------------------
   ANTES DE PEGARLO EN APPS SCRIPT, rellena estas tres líneas.
   Los valores reales de cada entorno están en CONTINUAR-PROYECTO.md,
   que vive FUERA de este repositorio porque el repo es publico.

   Produccion -> hoja "Control de Carga 2 Netso"
   Pruebas    -> hoja "Control de Cargas COPIA"
   ------------------------------------------------------------ */
const TOKEN      = "PEGA_AQUI_EL_TOKEN";
const FOLDER_ID  = "PEGA_AQUI_EL_ID_DE_LA_CARPETA_DE_DRIVE";
const DRY_RUN    = false;          // true = simula, no escribe nada

const SHEET_NAME  = "CONTROL DE CARGAS";
const LOG_SHEET   = "LOG";
const PAGOS_SHEET = "PAGOS";
const PEND_SHEET  = "PAGOS PENDIENTES";
const BUILD       = "v6.4";
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

/* etapa -> columna donde va el NÚMERO del documento.
   Es la columna de la que el dashboard saca la etiqueta del enlace:
   si está vacía, el enlace se muestra como "Abrir documento".

   Los nombres son EXACTOS y salen de un volcado de los encabezados
   reales, no de deducirlos. No los cambies sin volver a comprobarlos.

   RFQ no aparece a propósito: la hoja no tiene columna 'RFQ No', y
   dejarlo aquí haría que el número se escribiera sobre 'RFQ URL',
   borrando el enlace. Si algún día se crea esa columna, añade:
       rfq: "RFQ No",                                                  */
const STAGE_NUM_COLUMNS = {
  pi:  "PI No",
  inv: "Link Invoice",
  pl:  "Link Packing List",
  bl:  "BL",
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
      case "subirDoc":         return json(conBloqueo(function () { return subirDoc(p); }));
      case "guardarDatosPI":   return json(conBloqueo(function () { return guardarDatosPI(p); }));
      case "guardarNumeroDoc": return json(conBloqueo(function () { return guardarNumeroDoc(p); }));
      case "cambiarEstado":    return json(conBloqueo(function () { return cambiarEstado(p); }));
      case "crearCarga":       return json(conBloqueo(function () { return crearCarga(p); }));
      case "agregarPago":      return json(conBloqueo(function () { return agregarPago(p); }));
      case "crearPendiente":   return json(conBloqueo(function () { return crearPendiente(p); }));
      case "saldarPendiente":  return json(conBloqueo(function () { return saldarPendiente(p); }));
      case "borrarPendiente":  return json(conBloqueo(function () { return borrarPendiente(p); }));
      case "leer":             return json(leerSeguro());
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
      " (ID " + p.id + ") el archivo '" + p.filename + "'" +
      (p.numero ? " y el número '" + p.numero + "'" : "");
    logRow({ accion: "subirDoc", id: p.id, columna: colHeader, nuevo: p.filename, dryRun: true });
    return { dryRun: true, message: msg };
  }

  const blob = Utilities.newBlob(bytes, p.mimeType, p.filename);
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  const url  = file.getUrl();

  ctx.sheet.getRange(fila, col).setValue(url);
  logRow({ accion: "subirDoc", id: p.id, columna: colHeader, anterior: "", nuevo: url });

  /* Guardar también el número del documento.
     Solo si: la etapa tiene columna de número, llegó un número, la
     columna existe, NO es la misma que la de la URL, y está vacía.
     Cinco condiciones a propósito: nunca pisamos un número escrito a
     mano, y nunca podemos borrar un enlace por una colisión de columnas. */
  const headerNum = STAGE_NUM_COLUMNS[p.etapa];
  const numero = String(p.numero || "").trim();
  let numeroEscrito = "";
  if (headerNum && numero) {
    const idxNum = ctx.indice[headerNum.replace(/\s+/g, " ").trim().toLowerCase()];
    if (idxNum !== undefined && idxNum + 1 !== col) {
      const rngNum = ctx.sheet.getRange(fila, idxNum + 1);
      if (String(rngNum.getDisplayValue() || "").trim() === "") {
        rngNum.setValue(numero);
        numeroEscrito = numero;
        logRow({ accion: "subirDoc-numero", id: p.id, columna: headerNum,
                 anterior: "", nuevo: numero });
      }
    }
  }

  return { url: url, fila: fila, numero: numeroEscrito };
}

/* ============================================================
   ACCIÓN · guardarNumeroDoc
   Escribe a mano el número de un documento ya subido.
   A diferencia de subirDoc, esta SÍ sobrescribe: es una corrección
   deliberada del usuario. El valor anterior queda en el LOG, así que
   siempre se puede deshacer.
   ============================================================ */
function guardarNumeroDoc(p) {
  if (!p.id) throw new Error("Falta el ID de la carga");

  const etapa = String(p.etapa || "").trim();
  const headerNum = STAGE_NUM_COLUMNS[etapa];
  if (!headerNum) {
    throw new Error("La etapa '" + etapa + "' no tiene columna de número en esta hoja.");
  }

  const numero = String(p.numero == null ? "" : p.numero).trim();
  if (!numero) throw new Error("El número no puede quedar vacío.");
  if (numero.length > 120) throw new Error("El número es demasiado largo (máximo 120 caracteres).");

  const ctx  = contexto();
  const fila = buscarFila(ctx, p.id);
  const col  = columna(ctx, headerNum);

  /* Guarda de seguridad: si la columna del número coincidiera con la
     del enlace, escribir aquí borraría el documento. Preferimos fallar. */
  const headerUrl = STAGE_COLUMNS[etapa];
  if (headerUrl) {
    const colUrl = ctx.indice[headerUrl.replace(/\s+/g, " ").trim().toLowerCase()];
    if (colUrl !== undefined && colUrl + 1 === col) {
      throw new Error("Colisión de columnas: '" + headerNum + "' y '" + headerUrl +
        "' son la misma columna. No se escribe nada.");
    }
  }

  const anterior = escribirCelda(ctx, fila, col, numero, {
    accion: "guardarNumeroDoc", id: p.id, columna: headerNum,
  });

  return { fila: fila, columna: headerNum, anterior: anterior, nuevo: numero, dryRun: DRY_RUN };
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
    h.appendRow(["ID Carga", "Fecha", "Archivo", "URL", "Concepto"]);
  }
  return h;
}

/* Devuelve todos los pagos registrados. El dashboard los reparte por ID.
   El concepto es opcional: los comprobantes antiguos lo tienen vacío. */
function leerPagos() {
  const h = hojaPagos();
  const n = h.getLastRow();
  if (n < 2) return [];
  return h.getRange(2, 1, n - 1, 5).getDisplayValues()
    .filter(function (r) { return String(r[0]).trim() !== ""; })
    .map(function (r) {
      return {
        id: String(r[0]).trim(), fecha: r[1], archivo: r[2], url: r[3],
        concepto: String(r[4] == null ? "" : r[4]).trim(),
      };
    });
}

/* Sube un comprobante y AÑADE una fila a PAGOS.
   Nunca sobrescribe: una carga puede tener todos los pagos que haga falta.
   El concepto es opcional; si no llega, la celda queda vacía. */
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
  const concepto = String(p.concepto == null ? "" : p.concepto).trim().slice(0, 200);

  if (DRY_RUN) {
    const msg = "SIMULADO: añadiría un pago a " + p.id + " con fecha " +
      Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy") +
      (concepto ? " y concepto '" + concepto + "'" : "");
    logRow({ accion: "agregarPago", id: p.id, columna: PAGOS_SHEET, nuevo: p.filename, dryRun: true });
    return { dryRun: true, message: msg };
  }

  const blob = Utilities.newBlob(bytes, p.mimeType, p.filename);
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  const url  = file.getUrl();

  hojaPagos().appendRow([p.id, fecha, p.filename, url, concepto]);
  logRow({ accion: "agregarPago", id: p.id, columna: PAGOS_SHEET,
           nuevo: p.filename + " · " + url,
           detalle: concepto ? "concepto: " + concepto : "" });

  return { url: url, filename: p.filename, concepto: concepto };
}

/* ============================================================
   PAGOS PENDIENTES · lo que está programado pero aún no ocurrió.
   Pestaña propia para no mezclarlo con los comprobantes ya subidos.
   Un pendiente nunca se borra al saldarlo: se marca como pagado y
   queda como historial. Borrarlo es una acción distinta, para
   cuando se creó por error.
   ============================================================ */

/* La pestaña de pendientes. Se crea sola si no existe. */
function hojaPendientes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheets().filter(function (s) {
    return s.getName().trim().toUpperCase() === PEND_SHEET.toUpperCase();
  })[0];
  if (!h) {
    h = ss.insertSheet(PEND_SHEET);
    h.appendRow(["ID Pendiente", "ID Carga", "Fecha", "Monto",
                 "Concepto", "Estado", "Fecha de pago"]);
  }
  return h;
}

/* Convierte a número un importe escrito como se ve en la hoja.
   - Se ignoran el símbolo de moneda, los espacios y las letras.
   - Si hay punto Y coma, el ÚLTIMO que aparece es el decimal.
       3.730,40  y  3,730.40  ->  3730.4
   - Si solo hay uno, mandan los dígitos que le siguen:
       3 dígitos -> separador de miles   (1.500 = 1500)
       1 o 2     -> separador decimal    (1,50  = 1.5)
   Devuelve null si no se puede interpretar. */
function parsearMonto(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;

  let s = String(v).trim().replace(/[^\d.,\-]/g, "");
  if (!s) return null;

  const neg = s.charAt(0) === "-";
  s = s.replace(/-/g, "");

  const iPunto = s.lastIndexOf(".");
  const iComa  = s.lastIndexOf(",");
  let dec = -1;

  if (iPunto !== -1 && iComa !== -1) {
    dec = Math.max(iPunto, iComa);
  } else if (iPunto !== -1 || iComa !== -1) {
    const i = Math.max(iPunto, iComa);
    if (s.length - i - 1 !== 3) dec = i;   // 3 dígitos detrás => era separador de miles
  }

  let entero, decimales;
  if (dec === -1) {
    entero = s.replace(/[.,]/g, "");
    decimales = "";
  } else {
    entero    = s.slice(0, dec).replace(/[.,]/g, "");
    decimales = s.slice(dec + 1).replace(/[.,]/g, "");
  }

  if (!entero && !decimales) return null;
  const n = Number((entero || "0") + (decimales ? "." + decimales : ""));
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

/* Siguiente ID correlativo: P-001, P-002… */
function siguientePendienteId(h) {
  const n = h.getLastRow();
  let max = 0;
  if (n >= 2) {
    const ids = h.getRange(2, 1, n - 1, 1).getDisplayValues();
    for (let i = 0; i < ids.length; i++) {
      const m = String(ids[i][0] || "").trim().match(/^P-(\d+)$/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  let s = String(max + 1);
  while (s.length < 3) s = "0" + s;
  return "P-" + s;
}

/* Localiza la fila de un pendiente por su ID. Nunca por número de fila:
   si alguien ordena la hoja, la referencia por posición se rompería. */
function buscarFilaPendiente(h, idPendiente) {
  const id = String(idPendiente || "").trim();
  if (!id) throw new Error("Falta el ID del pago pendiente");
  const n = h.getLastRow();
  if (n < 2) throw new Error("No hay pagos pendientes registrados");
  const ids = h.getRange(2, 1, n - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) return i + 2;
  }
  throw new Error("No encontré ningún pago pendiente con ID: " + id);
}

/* Devuelve todos los pendientes. El dashboard los reparte por ID de carga
   y muestra solo los que siguen en estado 'pendiente'. */
function leerPendientes() {
  const h = hojaPendientes();
  const n = h.getLastRow();
  if (n < 2) return [];
  const vals = h.getRange(2, 1, n - 1, 7).getDisplayValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const r = vals[i];
    if (!String(r[0]).trim() || !String(r[1]).trim()) continue;
    out.push({
      idPendiente: String(r[0]).trim(),
      id:          String(r[1]).trim(),
      fecha:       r[2],
      monto:       r[3],
      concepto:    String(r[4] == null ? "" : r[4]).trim(),
      estado:      String(r[5] || "pendiente").trim().toLowerCase(),
      fechaPago:   r[6],
    });
  }
  return out;
}

/* ACCIÓN · crearPendiente */
function crearPendiente(p) {
  if (!p.id) throw new Error("Falta el ID de la carga");
  const ctx = contexto();
  buscarFila(ctx, p.id);                 // aborta si la carga no existe

  const fecha = parsearFecha(p.fecha);
  if (!fecha) throw new Error("Falta la fecha, o no la entiendo: '" + (p.fecha || "") + "'");

  const monto = parsearMonto(p.monto);
  if (monto === null) throw new Error("Falta el monto, o no lo entiendo: '" + (p.monto || "") + "'");
  if (monto <= 0) throw new Error("El monto tiene que ser mayor que cero.");

  const concepto = String(p.concepto == null ? "" : p.concepto).trim().slice(0, 200);
  const h = hojaPendientes();
  const idP = siguientePendienteId(h);

  if (DRY_RUN) {
    logRow({ accion: "crearPendiente", id: p.id, columna: PEND_SHEET,
             nuevo: idP + " · " + monto, dryRun: true });
    return { dryRun: true, idPendiente: idP, message: "SIMULADO: crearía " + idP };
  }

  h.appendRow([idP, p.id, fecha, monto, concepto, "pendiente", ""]);
  logRow({ accion: "crearPendiente", id: p.id, columna: PEND_SHEET,
           nuevo: idP + " · " + monto + (concepto ? " · " + concepto : ""),
           detalle: "fecha " + Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy") });

  return { idPendiente: idP, id: p.id, monto: monto, concepto: concepto };
}

/* ACCIÓN · saldarPendiente — lo marca como pagado, no lo borra. */
function saldarPendiente(p) {
  const h = hojaPendientes();
  const fila = buscarFilaPendiente(h, p.idPendiente);
  const estadoActual = String(h.getRange(fila, 6).getDisplayValue() || "").trim().toLowerCase();
  if (estadoActual === "pagado") throw new Error("Ese pago pendiente ya estaba saldado.");

  const fechaPago = parsearFecha(p.fecha) || new Date();

  if (DRY_RUN) {
    logRow({ accion: "saldarPendiente", id: p.idPendiente, columna: PEND_SHEET, dryRun: true });
    return { dryRun: true, message: "SIMULADO: saldaría " + p.idPendiente };
  }

  h.getRange(fila, 6).setValue("pagado");
  h.getRange(fila, 7).setValue(fechaPago);
  logRow({ accion: "saldarPendiente",
           id: String(h.getRange(fila, 2).getDisplayValue() || ""),
           columna: PEND_SHEET, anterior: estadoActual, nuevo: "pagado",
           detalle: String(p.idPendiente) });

  return { idPendiente: p.idPendiente, estado: "pagado" };
}

/* ACCIÓN · borrarPendiente — para los creados por error.
   La fila entera queda copiada en el LOG antes de eliminarla. */
function borrarPendiente(p) {
  const h = hojaPendientes();
  const fila = buscarFilaPendiente(h, p.idPendiente);
  const datos = h.getRange(fila, 1, 1, 7).getDisplayValues()[0];

  if (DRY_RUN) {
    logRow({ accion: "borrarPendiente", id: p.idPendiente, columna: PEND_SHEET, dryRun: true });
    return { dryRun: true, message: "SIMULADO: borraría " + p.idPendiente };
  }

  h.deleteRow(fila);
  logRow({ accion: "borrarPendiente", id: String(datos[1] || ""), columna: PEND_SHEET,
           anterior: datos.join(" · "), nuevo: "(borrado)", detalle: String(p.idPendiente) });

  return { idPendiente: p.idPendiente, borrado: true };
}

/* ============================================================
   ACCIÓN · leer  (método antiguo, v5)
   Se conserva como respaldo automático de leerV6. Respeta lo que
   está visible: si hay un filtro activo o filas ocultas a mano,
   esas filas no se envían.
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
           columnas: nC, ocultas: ocultas,
           pagos: leerPagos(), pendientes: leerPendientes() };
}

/* ============================================================
   ACCIÓN · leer · v6
   Una sola llamada a la API de Sheets trae valores, hipervínculos,
   metadatos de filas ocultas, los pagos Y los pendientes.
   Sustituye ~26 s de llamadas celda a celda por ~2 s.
   Requiere el servicio avanzado "Sheets" en el proyecto.
   ============================================================ */

const FIELDS_V6 = "sheets(properties(title),data(" +
  "rowData(values(formattedValue,hyperlink,textFormatRuns(format(link(uri)))))," +
  "rowMetadata(hiddenByFilter,hiddenByUser)))";

function colLetraV6(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - m) / 26); }
  return s;
}

function leerV6() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets().filter(function (s) {
    return s.getName().trim().toUpperCase() === SHEET_NAME.trim().toUpperCase();
  })[0];
  if (!sheet) throw new Error("No existe la pestaña: " + SHEET_NAME);

  const hojaP = hojaPagos();                  // la crea si no existe
  const nF = sheet.getLastRow(), nC = sheet.getLastColumn(), nFP = hojaP.getLastRow();
  const tCargas = sheet.getName(), tPagos = hojaP.getName();

  const hojaPend = hojaPendientes();          // la crea si no existe
  const nFPend = hojaPend.getLastRow();
  const tPend = hojaPend.getName();

  const rangos = ["'" + tCargas.replace(/'/g, "''") + "'!A1:" + colLetraV6(nC) + nF];
  if (nFP >= 2)    rangos.push("'" + tPagos.replace(/'/g, "''") + "'!A2:E" + nFP);
  if (nFPend >= 2) rangos.push("'" + tPend.replace(/'/g, "''") + "'!A2:G" + nFPend);

  const resp = Sheets.Spreadsheets.get(ss.getId(), { ranges: rangos, fields: FIELDS_V6 });

  const porTitulo = {};
  (resp.sheets || []).forEach(function (sh) {
    if (sh.properties) porTitulo[String(sh.properties.title).trim().toUpperCase()] = sh;
  });

  const shC = porTitulo[tCargas.trim().toUpperCase()];
  if (!shC || !shC.data || !shC.data[0]) throw new Error("La API no devolvió datos de " + tCargas);

  const grid = shC.data[0];
  const rowData = grid.rowData || [];
  const rowMeta = grid.rowMetadata || [];

  /* Guarda: sin metadatos de fila no se pueden respetar los filtros.
     Preferimos fallar (y caer al método antiguo) antes que devolver
     todas las filas como si no hubiera ningún filtro activo. */
  if (rowData.length && rowMeta.length !== rowData.length) {
    throw new Error("rowMetadata incompleto: " + rowMeta.length + " de " + rowData.length);
  }

  /* Fila de encabezados: misma lógica que contexto(), pero en memoria. */
  let headerRow = -1;
  for (let r = 0; r < Math.min(rowData.length, 10) && headerRow === -1; r++) {
    const vals = (rowData[r] && rowData[r].values) || [];
    for (let j = 0; j < vals.length; j++) {
      if (String((vals[j] || {}).formattedValue || "").trim() === ID_HEADER) { headerRow = r; break; }
    }
  }
  if (headerRow === -1) throw new Error("No encontré la fila de encabezados (columna '" + ID_HEADER + "')");

  const matriz = [], links = [];
  let ocultas = 0;

  for (let i = 0; i < rowData.length; i++) {
    const filaHoja = i + 1;
    if (filaHoja > headerRow + 1) {
      const m = rowMeta[i] || {};
      if (m.hiddenByFilter || m.hiddenByUser) { ocultas++; continue; }
    }
    const vals = (rowData[i] && rowData[i].values) || [];
    const fila = [], filaLinks = [];
    for (let j = 0; j < nC; j++) {
      const c = vals[j] || {};
      fila.push(c.formattedValue == null ? "" : c.formattedValue);
      let u = c.hyperlink || "";
      if (!u && c.textFormatRuns) {
        for (let k = 0; k < c.textFormatRuns.length; k++) {
          const l = c.textFormatRuns[k].format && c.textFormatRuns[k].format.link;
          if (l && l.uri) { u = l.uri; break; }
        }
      }
      filaLinks.push(u);
    }
    matriz.push(fila);
    links.push(filaLinks);
  }

  /* Pagos: vienen en la misma respuesta, sin llamada aparte. */
  const pagos = [];
  const shP = porTitulo[tPagos.trim().toUpperCase()];
  if (shP && shP.data && shP.data[0] && shP.data[0].rowData) {
    shP.data[0].rowData.forEach(function (f) {
      const v = f.values || [];
      const val = function (j) { return String(((v[j] || {}).formattedValue) || "").trim(); };
      if (!val(0)) return;
      pagos.push({ id: val(0), fecha: val(1), archivo: val(2), url: val(3), concepto: val(4) });
    });
  }

  /* Pendientes: igual, en la misma respuesta. */
  const pendientes = [];
  const shPend = porTitulo[tPend.trim().toUpperCase()];
  if (shPend && shPend.data && shPend.data[0] && shPend.data[0].rowData) {
    shPend.data[0].rowData.forEach(function (f) {
      const v = f.values || [];
      const val = function (j) { return String(((v[j] || {}).formattedValue) || "").trim(); };
      if (!val(0) || !val(1)) return;
      pendientes.push({
        idPendiente: val(0), id: val(1), fecha: val(2), monto: val(3),
        concepto: val(4), estado: (val(5) || "pendiente").toLowerCase(), fechaPago: val(6),
      });
    });
  }

  return { matriz: matriz, links: links, filas: matriz.length - 1,
           columnas: nC, ocultas: ocultas,
           pagos: pagos, pendientes: pendientes, via: "v6" };
}

/* Si leerV6 falla por lo que sea, el dashboard sigue funcionando
   con el método antiguo. La caída queda anotada en el LOG. */
function leerSeguro() {
  const t0 = Date.now();
  let r;
  try {
    r = leerV6();
  } catch (err) {
    logRow({ accion: "leer-fallback", detalle: String((err && err.message) || err) });
    r = leer();
    r.via = "v5-fallback";
  }
  r.ms = Date.now() - t0;
  return r;
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
