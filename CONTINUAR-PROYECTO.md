# Control de Cargas Netso — Traspaso del proyecto

Documento para retomar el proyecto en otra cuenta. Contiene el contexto completo,
las credenciales, el método de trabajo y lo que queda pendiente.

> ⚠️ **Este archivo contiene tokens. NO lo subas al repositorio de GitHub**, que es
> público. Guárdalo en tu Mac, fuera de la carpeta del proyecto.

---

## 1. Qué es

Un dashboard web de una sola página que muestra el seguimiento documental de
importaciones de Netso. Lee de una hoja de Google y permite subir documentos a
Drive, editar datos y crear cargas sin salir del navegador.

**Flujo documental de cada carga:** RFQ → PI → Invoice → Packing List → ETD → BL → ETA

## 2. Arquitectura

```
Navegador (index.html)
   │
   ├── LEE ──► Backend Apps Script (acción "leer")      ← fuente principal
   │      └──► Hoja publicada en la web (proxy Netlify) ← respaldo rápido
   │
   └── ESCRIBE ──► Backend Apps Script ──► Google Sheet + Google Drive

Repositorio GitHub ──auto──► Netlify ──► dominio
```

- **Frontend:** un único `index.html` (~2.500 líneas), sin build, sin frameworks,
  HTML + CSS + JS vanilla. Chart.js y SheetJS desde CDN.
- **Backend:** Google Apps Script vinculado a la hoja, desplegado como aplicación
  web. Es la única pieza que escribe.
- **Hosting:** Netlify, desplegando desde la rama `main` de GitHub.

## 3. Coordenadas

| Qué | Dónde |
|---|---|
| Repositorio | `github.com/avferrerp-art/Control-de-Carga-Netso` (público) |
| Dominio | `controlcarganetso.netlify.app` |
| Carpeta local | `~/Documents/Netso/CONTROL CARGA/Control-de-Carga-Netso` |
| Rama de trabajo | `feature/subida-drive` |
| Hoja real | "Control de Carga 2 Netso" · pestañas `Control de cargas`, `LOG`, `PAGOS` |
| Hoja de pruebas | "Control de Cargas COPIA" |

### Backend de producción (hoja real)

```
URL:    https://script.google.com/macros/s/AKfycbwI93pWOThAv08ZuvGWOQdDvkslhp4lDGbDrPR2fBHTcb46mCrzUExiVN05iUWlP4z4/exec
TOKEN:  netso-prod-4t9w2k7m3x8q
DRIVE:  1M_EZcU-hFNmjfC6xQAjehEcnNS7CuH-F
```

### Backend de pruebas (hoja copia)

```
URL:    https://script.google.com/macros/s/AKfycbxunQr7hdyv2-pU95MeQl5ZsnlGJtlpbNa8Zqc7XxkAO_USJ5SjN3XUMLHgHRarnCK1jg/exec
TOKEN:  netso-pruebas-7k3m9x2q8f
DRIVE:  1X3raLmdx5wIJkU5V-yPPqNx7cdevLSsT
```

> El token va en dos sitios y **tiene que coincidir**: la constante `TOKEN` del
> Apps Script y la constante `UPLOAD_TOKEN` de `index.html`.

## 4. Estructura de la hoja

**Pestaña `Control de cargas`** — una fila por carga. Columnas relevantes:

- `ID` — identificador estable (`C-001`, `C-002`…). **Es la llave de todo.**
- `Status` — uno de los 7 estados válidos
- `Supplier`, `PI No`, `Link Invoice`, `Link Packing List`, `BL`, `Container ID`, `Agente aduanal`
- `Subtotal`, `Flete` — se escriben a mano
- `Total` = `Subtotal + Flete` · `Total Anticipo` = `Total × Anticipo(%)` · `Por Pagar` = `Total − Total Anticipo` → **son fórmulas, no se tocan nunca**
- `Anticipo (%)` — se escribe a mano, guarda una fracción (0.2 = 20%)
- Columnas creadas para el dashboard: `RFQ URL`, `PI URL`, `Invoice URL`, `PL URL`, `BL URL`, `Terminos de credito`, `Pago PI URL`, `Fecha de pago`, `Observaciones`

**Pestaña `LOG`** — auditoría. Una fila por escritura, con el **valor anterior**.
Es lo que permite revertir cualquier cambio.

**Pestaña `PAGOS`** — una fila por comprobante de pago: `ID Carga · Fecha · Archivo · URL`.
Sin límite por carga.

### Los 7 estados

```
En cotización · En produccion · En espera de despacho · En camino ·
Proc. Nacionalización · Recibido · Indefinido
```

Cada uno define qué documentos se consideran obligatorios (constante `REQUIRED`
en `index.html`). `En cotización` no exige ninguno, a propósito: una carga recién
creada nunca debe salir en rojo.

## 5. Acciones del backend (v5)

Todas por POST con `Content-Type: text/plain;charset=utf-8` — es intencional,
evita el preflight de CORS que Apps Script no soporta.

| Acción | Qué hace |
|---|---|
| `subirDoc` | Sube un archivo a Drive y escribe la URL en la columna de esa etapa. **Se niega a sobrescribir.** |
| `guardarDatosPI` | Escribe los campos del formulario del PI. Solo los que llegan; los ausentes no se tocan. Sobrescribe registrando el valor anterior. |
| `cambiarEstado` | Cambia `Status`, validando contra la lista de 7. |
| `crearCarga` | Añade una fila al final, genera el ID correlativo y **copia las fórmulas** de la fila anterior. |
| `agregarPago` | Sube un comprobante y **añade** una fila a `PAGOS`. Nunca sobrescribe. |
| `leer` | Devuelve la hoja completa + los pagos. Respeta filtros y filas ocultas. |

Todas las escrituras pasan por `LockService` y quedan en el `LOG`.

## 6. El método de trabajo (esto es lo importante)

El proyecto se construyó con Antigravity dando prompts pequeños. El orden importa:

1. **Todo se prueba primero en la hoja COPIA.** Nunca se estrena nada sobre la real.
2. **`DRY_RUN = true` primero.** El backend simula, registra en el `LOG` y no
   escribe. Cuando el LOG demuestra que apunta a la celda correcta, se pasa a `false`.
3. **Un prompt = un cambio pequeño y verificable.** Nunca dos.
4. **Commit antes de cada prompt**, para tener punto de retorno.
5. **Revisar el diff después de cada prompt**, siempre con:
   ```bash
   git diff -U0 | grep "^-" | grep -v "^---"
   ```
   Eso muestra solo lo que se borró o modificó. Si toca funciones protegidas, se
   descarta la conversación entera y se reformula. Nunca se parchea con otro prompt.
6. **Rama → push → Pull Request → Deploy Preview → probar → merge.** El merge es
   el único paso que toca el dominio.

### Las Rules de Antigravity

En `.agents/rules/no-tocar-codigo-existente.md` del repo hay un archivo que el
agente respeta siempre: lista de funciones y constantes que no puede tocar, más
un bloque de excepciones autorizadas explícitamente. **Mantenerlo actualizado es
lo que ha evitado que el agente rompa el código.**

Si una tarea nueva exige tocar algo protegido, se añade una excepción concreta a
ese archivo antes de lanzar el prompt — no se quita la protección.

## 7. Trampas conocidas (todas costaron tiempo)

**Redesplegar el Apps Script.** Guardar no publica. Hay que hacer
*Implementar → Administrar implementaciones → ✏️ → Versión: **Nueva***. Si el
`doGet` en incógnito sigue mostrando el `build` viejo, no se aplicó. Si editar la
implementación no funciona, crear una nueva — pero entonces **la URL cambia** y
hay que actualizarla en `index.html`.

**El `UPLOAD_URL` durante el desarrollo.** Para probar se apunta a la copia, y
**hay que devolverlo a producción antes del merge**. Si no, el dominio escribiría
en la hoja de pruebas.

**Filtros y columnas ocultas.** La hoja publicada (`pubhtml`) solo publica lo
visible. Un filtro activo hacía que el dashboard mostrara 17 de 85 cargas. El
backend ahora replica ese comportamiento a propósito, para que ambas fuentes
coincidan y no haya parpadeo.

**El caché de Google.** La hoja publicada se cachea ~5 minutos. Por eso la
lectura principal es por API.

**Probar en el sitio equivocado.** Tres entornos distintos:
`localhost:8000` (archivo local) · `deploy-preview-N--...` (la rama) ·
`controlcarganetso.netlify.app` (main). Y siempre recargar con `Cmd+Shift+R`.

**Deploy Previews solo existen para PR abiertos.** Si el PR está cerrado, Netlify
no construye nada aunque hagas push.

**CORS desde `file://`.** Las subidas se bloquean. Para probar en local hay que
levantar `python3 -m http.server 8000`.

## 8. Estado actual

Funcionando en producción:

- Subida de documentos a Drive con enlace en la celda
- Formulario de datos del PI tras subir la proforma, con cálculo de anticipo en % o $
- Botón "Editar datos" para modificar esos datos en cualquier momento
- Cambio de estado desde el dashboard
- Creación de cargas
- Comprobantes de pago múltiples con su fecha, en pestaña propia
- Lectura por API con respaldo en la hoja publicada, carga rápida primero

## 9. Pendientes

**Velocidad de la lectura por API (~10 s).** La causa es `getRichTextValues()`
sobre toda la hoja: crea un objeto por celda, unas 2.760. Solo hacen falta los
enlaces en ~12 columnas. Limitándolo a esas debería bajar a 3-4 s. También sobra
una lectura redundante dentro de `contexto()` cuando la acción es `leer`.

**Prellenar subtotal y anticipo al editar.** Hoy llegan formateados (`"$18.652,00"`,
`"20%"`) y no se pueden meter en un campo numérico, así que salen vacíos con el
valor actual mostrado al lado como referencia. La solución sería una acción nueva
en el backend que devuelva los valores crudos de una carga.

**Limpieza.** Quedan filas de prueba en la hoja real (`PRUEBA MIGRACION` y
similares) y sus archivos en Drive.

## 10. Operación

- Los archivos subidos heredan los permisos de la carpeta de Drive. Si el equipo
  va a abrir esos enlaces, hay que compartirles esa carpeta.
- El token está visible en el código fuente del dashboard, que es público. Con un
  equipo pequeño es aceptable, pero **no conviene publicar la URL del dashboard**.
- **No borrar la hoja copia ni su script.** Es el entorno de pruebas, y es lo que
  ha permitido que nada se rompiera en producción.
