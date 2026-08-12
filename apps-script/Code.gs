/* ============================================================
   CONFIG — edita estas 3 líneas antes de desplegar
   ============================================================ */
const TOKEN      = "TU-TOKEN-AQUI";
const FOLDER_ID  = "TU-FOLDER-ID-AQUI";     // de drive.google.com/drive/folders/AQUI
const SHEET_NAME = "CONTROL DE CARGAS";
const LOG_SHEET  = "LOG";
const DRY_RUN    = true;   

const ID_HEADER = "ID";

/* etapa (como la manda el dashboard) -> nombre EXACTO del encabezado en la hoja.
   Si cambias estos nombres, tienen que coincidir letra por letra con las
   columnas que creaste en el Sheet. */
const STAGE_COLUMNS = {
  rfq: "RFQ URL",
  pi:  "PI URL",
  inv: "Invoice URL",
  pl:  "PL URL",
  bl:  "BL URL",
};

const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];
const MAX_BYTES    = 10 * 1024 * 1024; // 10 MB

/* ============================================================
   ENDPOINTS
   ============================================================ */
function doGet(e) {
  return json({ ok: true, build: "v2", dryRun: DRY_RUN, message: "Backend activo." });
}

function doPost(e) {
  try {
    return handleUpload(e);
  } catch (err) {
    logRow({ ok: false, error: String(err) });
    return json({ ok: false, error: String(err) });
  }
}

function handleUpload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Sin cuerpo en la petición");
  }
  const p = JSON.parse(e.postData.contents);

  // 1) Autenticación
  if (p.token !== TOKEN) throw new Error("Token inválido");

  // 2) Campos obligatorios
  ["id", "etapa", "filename", "mimeType", "base64"].forEach(k => {
    if (!p[k]) throw new Error("Falta el campo: " + k);
  });

  // 3) Etapa conocida
  const colHeader = STAGE_COLUMNS[p.etapa];
  if (!colHeader) throw new Error("Etapa desconocida: " + p.etapa);

  // 4) Extensión permitida
  const ext = (p.filename.split(".").pop() || "").toLowerCase();
  if (ALLOWED_EXT.indexOf(ext) === -1) {
    throw new Error("Extensión no permitida: ." + ext);
  }

  // 5) Tamaño real del archivo (no del texto base64, que pesa ~33% más)
  const bytes = Utilities.base64Decode(p.base64);
  if (bytes.length > MAX_BYTES) {
    throw new Error("Archivo demasiado grande: " +
      Math.round(bytes.length / 1024 / 1024 * 10) / 10 + " MB (máximo 10MB)");
  }

  // 6) Ubicar la fila del ID en la hoja
   const ss = SpreadsheetApp.getActiveSpreadsheet();
   const sheet = ss.getSheets().find(s =>
    s.getName().trim().toUpperCase() === SHEET_NAME.trim().toUpperCase());
  if (!sheet) throw new Error("No existe la pestaña: " + SHEET_NAME);

  const data = sheet.getDataRange().getValues();
  const headerRowIdx = findHeaderRow(data);
  if (headerRowIdx === -1) {
    throw new Error("No encontré la fila de encabezados (columna '" + ID_HEADER + "')");
  }

  const headers = data[headerRowIdx].map(h => String(h).trim());
  const idColIdx  = headers.indexOf(ID_HEADER);
  const urlColIdx = headers.indexOf(colHeader);
  if (idColIdx === -1)  throw new Error("No encontré la columna '" + ID_HEADER + "'");
  if (urlColIdx === -1) {
    throw new Error("No encontré la columna '" + colHeader + "'. Créala vacía antes de usar la subida.");
  }

  let targetRow = -1;
  for (let r = headerRowIdx + 1; r < data.length; r++) {
    if (String(data[r][idColIdx]).trim() === String(p.id).trim()) { targetRow = r; break; }
  }
  if (targetRow === -1) throw new Error("No encontré ninguna carga con ID: " + p.id);

  // 7) Nunca pisar un valor que ya exista
  const currentValue = String(data[targetRow][urlColIdx] || "").trim();
  if (currentValue !== "") {
    throw new Error("La celda '" + colHeader + "' de esta carga ya tiene un valor. " +
      "Bórrala a mano en el Sheet si quieres reemplazarla.");
  }

  const rowNumber = targetRow + 1;   // getRange es 1-index
  const colNumber = urlColIdx + 1;

  // ---- MODO SIMULACIÓN: no toca Drive ni el Sheet ----
  if (DRY_RUN) {
    const msg = "SIMULADO: escribiría en '" + colHeader + "' fila " + rowNumber +
      " (ID " + p.id + ") el archivo '" + p.filename + "' (" +
      Math.round(bytes.length / 1024) + " KB)";
    logRow({ ok: true, dryRun: true, id: p.id, etapa: p.etapa, filename: p.filename, mensaje: msg });
    return json({ ok: true, dryRun: true, message: msg });
  }

  // 8) Subir a Drive
  const blob = Utilities.newBlob(bytes, p.mimeType, p.filename);
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);
  const url = file.getUrl();

  // 9) Escribir SOLO esa celda
  sheet.getRange(rowNumber, colNumber).setValue(url);

  // 10) Registrar en LOG
  logRow({ ok: true, id: p.id, etapa: p.etapa, filename: p.filename, url: url });

  return json({ ok: true, url: url });
}

/* Busca la fila de encabezados: la primera de las 10 primeras filas que
   contenga la columna ID. Así no importa si hay títulos arriba. */
function findHeaderRow(data) {
  for (let r = 0; r < Math.min(data.length, 10); r++) {
    const row = data[r].map(c => String(c).trim());
    if (row.indexOf(ID_HEADER) !== -1) return r;
  }
  return -1;
}

function logRow(obj) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName(LOG_SHEET);
    if (!log) {
      log = ss.insertSheet(LOG_SHEET);
      log.appendRow(["Fecha", "OK", "Dry-run", "ID", "Etapa", "Archivo", "URL / Error"]);
    }
    log.appendRow([
      new Date(), obj.ok, !!obj.dryRun, obj.id || "", obj.etapa || "",
      obj.filename || "", obj.url || obj.error || obj.mensaje || ""
    ]);
  } catch (e) {
    // si falla el log, no debe tumbar la subida
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
