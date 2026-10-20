# cf-api-restful

API RESTful de **sensores** y **mediciones** construida con Node.js y Express.js 5.1.0 — Práctica 5, Computación Física.

Implementa el diseño completo de la Tabla 4 de la guía: CRUD de sensores y CRUD de mediciones anidadas en cada sensor, con los códigos de respuesta HTTP correspondientes.

## Modelo

`Sensor` 1 → 0..* `Medición` (asociación dirigida: el sensor contiene el arreglo de sus mediciones; la medición no conoce a su sensor).

```json
{
  "id": 0,
  "nombre": "Sensor de Temperatura - UAO - InfoLab",
  "mediciones": [
    { "id": 0, "momento": "2020-04-12T12:53:22.647Z", "valor": 33.2, "unidad": "ºC" }
  ]
}
```

## Endpoints

| Verbo  | Código | Path URL | Descripción |
|--------|--------|----------|-------------|
| GET    | 200 | `/sensores` | Lee todos los sensores. Query opcional `?nombre=texto` |
| POST   | 201 | `/sensores` | Crea un sensor (`nombre` obligatorio; `mediciones` opcional) |
| GET    | 200 | `/sensores/{id}` | Lee un sensor |
| PUT    | 200 | `/sensores/{id}` | Actualiza un sensor |
| DELETE | 204 | `/sensores/{id}` | Elimina un sensor |
| GET    | 200 | `/sensores/{id}/mediciones` | Lee las mediciones del sensor. Query opcional `?desde=ISO&hasta=ISO` |
| POST   | 201 | `/sensores/{id}/mediciones` | Crea una medición (`valor` numérico y `unidad` obligatorios; `momento` opcional) |
| GET    | 200 | `/sensores/{id}/mediciones/{id}` | Lee una medición |
| PUT    | 200 | `/sensores/{id}/mediciones/{id}` | Actualiza una medición |
| DELETE | 204 | `/sensores/{id}/mediciones/{id}` | Elimina una medición |

Errores: **400** cuerpo inválido o JSON mal formado · **404** sensor, medición o ruta inexistente · **405** verbo no soportado en la URL (incluye cabecera `Allow`) · **500** error interno.

> Los datos se guardan en memoria: al reiniciar el servidor vuelve a quedar solo el sensor de ejemplo con id 0.

## Ejecutar en GitHub Codespaces

1. En GitHub crea el repositorio `cf-api-restful` con *Add a README file*.
2. **Code → Codespaces → Create codespace on main**. Confía en la carpeta para habilitar la terminal.
3. Sube los archivos de este proyecto (arrastrándolos al explorador de archivos) o, si partes de cero:
   ```bash
   npm init -y
   npm install express@5.1.0
   ```
   y copia `index.js`.
4. Si subiste el proyecto completo, instala dependencias:
   ```bash
   npm install
   ```
5. Ejecuta el servidor:
   ```bash
   node index.js
   ```
   Debe aparecer: `Servidor escuchando en el puerto: 3000`
6. Pestaña **Ports** → clic derecho sobre el puerto 3000 → **Port Visibility → Public**.
7. Copia la **Forwarded Address**: esa es la URL de la API RESTful.

## Probar con Boomerang (SOAP & REST Client)

Reemplaza `URL` por la Forwarded Address de Codespaces.

| # | Método | Request URL | Body (application/json) | Respuesta esperada |
|---|--------|-------------|-------------------------|--------------------|
| 1 | GET | `URL/sensores` | — | 200, arreglo con el sensor 0 |
| 2 | POST | `URL/sensores/0/mediciones` | `{"momento":"2020-10-23T20:51:39.720Z","valor":27.8,"unidad":"ºC"}` | 201, medición con `id: 2` |
| 3 | POST | `URL/sensores` | `{"nombre":"Sensor de Humedad - UAO - InfoLab"}` | 201, sensor con `id: 1` |
| 4 | GET | `URL/sensores/1` | — | 200, sensor 1 |
| 5 | PUT | `URL/sensores/1` | `{"nombre":"Sensor de Humedad - Lab 2"}` | 200, sensor actualizado |
| 6 | GET | `URL/sensores/0/mediciones` | — | 200, arreglo de 3 mediciones |
| 7 | GET | `URL/sensores/0/mediciones/2` | — | 200, medición 2 |
| 8 | PUT | `URL/sensores/0/mediciones/2` | `{"valor":30.1,"unidad":"ºC"}` | 200, medición actualizada |
| 9 | DELETE | `URL/sensores/0/mediciones/2` | — | 204 sin contenido |
| 10 | DELETE | `URL/sensores/1` | — | 204 sin contenido |
| 11 | GET | `URL/sensores/99` | — | 404 |
| 12 | DELETE | `URL/sensores` | — | 405 |
| 13 | POST | `URL/sensores` | `{}` | 400 |

El archivo `requests.http` contiene estas mismas peticiones para la extensión *REST Client* de VS Code (ya disponible en Codespaces).

## Pruebas automáticas

```bash
npm test
```

Ejecuta `test/api.test.js` con el runner nativo de Node.js (requiere Node 18+) y verifica los 10 endpoints y los códigos 400/404/405.

## Nota

Codespaces suspende el entorno tras un periodo de inactividad. Para reanudar: github.com/codespaces → abrir el codespace → `node index.js` → verificar que el puerto 3000 siga **Public**. Al terminar, detén el codespace para no consumir la cuota gratuita.
