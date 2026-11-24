# PIVP Alicorp · Operaciones de pedidos

Prototipo académico basado en **Módulo de inicio** y ampliado con los requerimientos de
**Implementación de Dashboard principal**. La interfaz usa HTML, CSS y JavaScript/React;
la API de operaciones usa Python, FastAPI y la base SQLite del proyecto. Los clientes y
productos de demostración se cargan al iniciar una base nueva.

## Requisitos

- Node.js 18 o superior
- Python 3.10 o superior
- Ollama instalado localmente y un modelo descargado (por defecto, `llama3.2`)

## Inicio local

En una terminal, instala las dependencias de la interfaz y ejecútala:

```powershell
npm install
npm run dev
```

En una segunda terminal, instala las dependencias de Python y levanta la API:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

Instala Ollama para Windows y descarga el modelo una vez:

```powershell
ollama pull llama3.2
```

La aplicación de Ollama suele iniciar el servicio local automáticamente; si no está
activo, ejecútalo con `ollama serve`.
Si Ollama usa otro modelo o dirección, configura `OLLAMA_MODEL` y
`OLLAMA_BASE_URL` en la terminal que ejecuta la API. El chat envía a Ollama el
contexto operativo de la base local y funciona en modo de solo consulta.

Abre la dirección que Vite muestra (normalmente `http://localhost:5173`). La API
está disponible en `http://127.0.0.1:8000`; su documentación interactiva está en
`http://127.0.0.1:8000/docs`.

Los pedidos, cambios de inventario, entregas y notificaciones se guardan en
`backend/alicorp.db` y se vuelven a consultar desde la API al recargar la página.
La base se crea automáticamente y se conserva entre reinicios; para el uso normal,
no configures la variable opcional `ALICORP_DATABASE`.

## Despliegue de demostración en Vercel

El repositorio incluye la configuración para desplegar la interfaz Vite y la API
FastAPI en el mismo proyecto de Vercel. Desde la raíz, ejecuta:

```powershell
npx vercel
```

En Vercel usa `npm run build` como comando de compilación y `dist` como directorio
de salida. La API quedará en la misma URL, bajo `/api`, por lo que no requiere una
variable de URL adicional ni cambios de CORS.

La instantánea `backend/seed/alicorp.db` se publica con el proyecto. En una instancia
nueva, Vercel la copia a `/tmp/alicorp.db`, por lo que la demostración comienza con
los pedidos, entregas, inventario y notificaciones existentes en la base local al
momento de desplegar. Los cambios realizados desde la web publicada se reinician
cuando la Function se recicla. Para conservar datos nuevos en producción hay que
migrar el almacenamiento a una base PostgreSQL administrada y configurar sus
credenciales como variables de entorno de Vercel.

Las actualizaciones por WebSocket se desactivan automáticamente en producción y la
interfaz conserva la actualización de respaldo cada 30 segundos. El asistente basado
en Ollama sigue siendo una función local; requiere un servicio Ollama accesible desde
Internet para funcionar en Vercel.

## Módulos incluidos

- Interfaz adaptable a móviles, tablets y escritorio; navegación desplazable,
  iconos SVG ampliados y tema claro/oscuro con preferencia guardada en el navegador.
- Inicio: indicadores operativos, alertas y pedidos recientes.
- Dashboard: ocho indicadores KPI, filtros por periodo, solicitante y
  estado; gráficos de pedidos, productos, movimientos, áreas y calificaciones;
  detalle de indicadores y última actualización.
- Registrar pedido: 10 clientes, canales Diadia e Insuma, 20 productos, carrito
  y validación comercial antes del registro.
- Disponibilidad y reabastecimiento: ATP, alertas automáticas de faltantes, solicitudes
  manuales y gestión del almacén. Con ATP cero se puede notificar a Almacén Central
  sin crear una solicitud ni modificar existencias; se muestra una confirmación emergente.
- Despacho y seguimiento: registro de entregas parciales o completas, código de
  seguimiento, cantidades restantes e historial de eventos.
- Confirmación de entrega: recepción por producto, recepción independiente de la
  factura, observaciones y calificación de 1 a 5 estrellas.
- Consulta del cliente: búsqueda por número de pedido o código de cualquier entrega.
- Notificaciones: avisos de pedidos, abastecimiento, confirmaciones y facturas, con contador de pendientes y ventana emergente de recientes.
- Guía rápida: chat local con Ollama para consultar productos, ATP, pedidos,
  entregas, abastecimientos y ayuda para usar los módulos. No modifica datos.
- Actualización del dashboard por WebSocket, con consulta de respaldo cada 30 segundos.

Los PDFs mencionan PostgreSQL, inicio de sesión y roles, pero esta carpeta no contiene
una instancia PostgreSQL ni un módulo de autenticación existente. Para mantener la
arquitectura que sí está presente, los datos se guardan en `backend/alicorp.db` y la
confirmación permite seleccionar el cliente solicitante a modo de demostración; esto
no sustituye la autenticación ni la autorización segura para producción. Del mismo
modo, SAP S/4HANA se simula y su indicador de conexión es ilustrativo.
