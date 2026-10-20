const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Variables empleadas para el funcionamiento de la API
var nextSensorId = 0;
var nextMeasurementId = 0;
var sensors = new Array();

// Valores de referencia para el ejemplo de objeto sensor con sus medidas
var temperatureMax = 36;
var temperatureMin = 19;

// ---------------------------------------------------------------------------
// Funciones auxiliares
// ---------------------------------------------------------------------------

// Genera un valor aleatorio de temperatura con un decimal
function randomTemperature() {
  return Number(
    (Math.random() * (temperatureMax - temperatureMin) + temperatureMin).toFixed(1)
  );
}

// Busca un sensor por su id (el id llega como texto en la URL)
function findSensor(sensorId) {
  return sensors.find((s) => s.id === Number(sensorId));
}

// Busca una medición dentro de un sensor por su id
function findMeasurement(sensor, measurementId) {
  return sensor.mediciones.find((m) => m.id === Number(measurementId));
}

// Valida el cuerpo de un sensor. Retorna un mensaje de error o null si es válido
function validateSensor(body) {
  if (body === undefined || body === null || typeof body !== "object" || Array.isArray(body)) {
    return "El cuerpo de la petición debe ser un objeto JSON";
  }
  if (typeof body.nombre !== "string" || body.nombre.trim() === "") {
    return "El campo 'nombre' es obligatorio y debe ser un texto";
  }
  if (body.mediciones !== undefined && !Array.isArray(body.mediciones)) {
    return "El campo 'mediciones' debe ser un arreglo";
  }
  return null;
}

// Valida el cuerpo de una medición. Retorna un mensaje de error o null si es válido
function validateMeasurement(body) {
  if (body === undefined || body === null || typeof body !== "object" || Array.isArray(body)) {
    return "El cuerpo de la petición debe ser un objeto JSON";
  }
  if (typeof body.valor !== "number" || Number.isNaN(body.valor)) {
    return "El campo 'valor' es obligatorio y debe ser numérico";
  }
  if (typeof body.unidad !== "string" || body.unidad.trim() === "") {
    return "El campo 'unidad' es obligatorio y debe ser un texto";
  }
  if (body.momento !== undefined && Number.isNaN(Date.parse(body.momento))) {
    return "El campo 'momento' debe ser una fecha válida en formato ISO 8601";
  }
  return null;
}

// Construye un objeto medición limpio a partir del cuerpo recibido
function buildMeasurement(body, id) {
  return {
    id: id,
    momento: body.momento !== undefined ? new Date(body.momento) : new Date(),
    valor: body.valor,
    unidad: body.unidad,
  };
}

// Respuesta para verbos HTTP no soportados en una URL
function methodNotAllowed(allowed) {
  return (req, res) => {
    res.set("Allow", allowed);
    res
      .status(405)
      .send(`El método ${req.method} no está soportado en ${req.originalUrl}`);
  };
}

// ---------------------------------------------------------------------------
// Ejemplo de objeto sensor
// ---------------------------------------------------------------------------
var sensorExample = {
  id: nextSensorId,
  nombre: "Sensor de Temperatura - UAO - InfoLab",
  mediciones: [
    {
      id: nextMeasurementId++,
      momento: new Date(),
      valor: randomTemperature(),
      unidad: "ºC",
    },
    {
      id: nextMeasurementId++,
      momento: new Date(),
      valor: randomTemperature(),
      unidad: "ºC",
    },
  ],
};

// Agrega el objeto sensor al arreglo de sensores
sensors.push(sensorExample);
nextSensorId++;

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

// Getter por defecto
app.get("/", (req, res) => {
  res.status(200).send("recuerda agregar '/sensores' al final de la URL");
});

// /sensores ------------------------------------------------------------------
app
  .route("/sensores")
  // GET 200: Retorna todos los sensores almacenados
  // Soporta query opcional: /sensores?nombre=texto (filtra por coincidencia parcial)
  .get((req, res) => {
    let result = sensors;
    if (req.query.nombre !== undefined) {
      let filter = String(req.query.nombre).toLowerCase();
      result = sensors.filter((s) => s.nombre.toLowerCase().includes(filter));
    }
    res.status(200).send(result);
  })
  // POST 201: Almacena un nuevo sensor
  .post((req, res) => {
    let error = validateSensor(req.body);
    if (error) {
      return res.status(400).send(error);
    }
    let sensor = {
      id: nextSensorId++,
      nombre: req.body.nombre,
      mediciones: new Array(),
    };
    // Si el sensor llega con mediciones, se validan y se les asigna id
    if (Array.isArray(req.body.mediciones)) {
      for (let m of req.body.mediciones) {
        let mError = validateMeasurement(m);
        if (mError) {
          nextSensorId--;
          return res.status(400).send(`Medición inválida: ${mError}`);
        }
      }
      sensor.mediciones = req.body.mediciones.map((m) =>
        buildMeasurement(m, nextMeasurementId++)
      );
    }
    sensors.push(sensor);
    res.status(201).send(sensor);
  })
  .all(methodNotAllowed("GET, POST"));

// /sensores/:sensorId ----------------------------------------------------------
app
  .route("/sensores/:sensorId")
  // GET 200: Retorna el sensor con el id pasado en el parámetro sensorId
  .get((req, res) => {
    let sensorId = req.params.sensorId;
    let sensor = findSensor(sensorId);
    if (sensor !== undefined) {
      res.status(200).send(sensor);
    } else {
      res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
  })
  // PUT 200: Actualiza el sensor con el id pasado en el parámetro sensorId
  .put((req, res) => {
    let sensorId = req.params.sensorId;
    let sensor = findSensor(sensorId);
    if (sensor === undefined) {
      return res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
    let error = validateSensor(req.body);
    if (error) {
      return res.status(400).send(error);
    }
    // Se actualiza el nombre; el id nunca cambia.
    sensor.nombre = req.body.nombre;
    // Si se envían mediciones, reemplazan a las existentes
    if (Array.isArray(req.body.mediciones)) {
      for (let m of req.body.mediciones) {
        let mError = validateMeasurement(m);
        if (mError) {
          return res.status(400).send(`Medición inválida: ${mError}`);
        }
      }
      sensor.mediciones = req.body.mediciones.map((m) =>
        buildMeasurement(m, nextMeasurementId++)
      );
    }
    res.status(200).send(sensor);
  })
  // DELETE 204: Elimina el sensor con el id pasado en el parámetro sensorId
  .delete((req, res) => {
    let sensorId = req.params.sensorId;
    let index = sensors.findIndex((s) => s.id === Number(sensorId));
    if (index === -1) {
      return res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
    sensors.splice(index, 1);
    res.status(204).send();
  })
  .all(methodNotAllowed("GET, PUT, DELETE"));

// /sensores/:sensorId/mediciones ---------------------------------------------
app
  .route("/sensores/:sensorId/mediciones")
  // GET 200: Retorna todas las mediciones del sensor
  // Soporta query opcional: ?desde=ISO&hasta=ISO (filtra por momento)
  .get((req, res) => {
    let sensorId = req.params.sensorId;
    let sensor = findSensor(sensorId);
    if (sensor === undefined) {
      return res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
    let result = sensor.mediciones;
    if (req.query.desde !== undefined) {
      let desde = Date.parse(req.query.desde);
      if (Number.isNaN(desde)) {
        return res.status(400).send("El parámetro 'desde' no es una fecha válida");
      }
      result = result.filter((m) => new Date(m.momento).getTime() >= desde);
    }
    if (req.query.hasta !== undefined) {
      let hasta = Date.parse(req.query.hasta);
      if (Number.isNaN(hasta)) {
        return res.status(400).send("El parámetro 'hasta' no es una fecha válida");
      }
      result = result.filter((m) => new Date(m.momento).getTime() <= hasta);
    }
    res.status(200).send(result);
  })
  // POST 201: Almacena una nueva medición en el sensor
  .post((req, res) => {
    let sensorId = req.params.sensorId;
    let sensor = findSensor(sensorId);
    if (sensor === undefined) {
      return res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
    let error = validateMeasurement(req.body);
    if (error) {
      return res.status(400).send(error);
    }
    let measurement = buildMeasurement(req.body, nextMeasurementId++);
    if (sensor.mediciones === undefined) {
      sensor.mediciones = new Array();
    }
    sensor.mediciones.push(measurement);
    res.status(201).send(measurement);
  })
  .all(methodNotAllowed("GET, POST"));

// /sensores/:sensorId/mediciones/:measurementId -------------------------------
app
  .route("/sensores/:sensorId/mediciones/:measurementId")
  // GET 200: Retorna la medición del sensor indicado
  .get((req, res) => {
    let { sensorId, measurementId } = req.params;
    let sensor = findSensor(sensorId);
    if (sensor === undefined) {
      return res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
    let measurement = findMeasurement(sensor, measurementId);
    if (measurement === undefined) {
      return res
        .status(404)
        .send(`La medición con id: ${measurementId} no existe en el sensor ${sensorId}`);
    }
    res.status(200).send(measurement);
  })
  // PUT 200: Actualiza la medición del sensor indicado
  .put((req, res) => {
    let { sensorId, measurementId } = req.params;
    let sensor = findSensor(sensorId);
    if (sensor === undefined) {
      return res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
    let measurement = findMeasurement(sensor, measurementId);
    if (measurement === undefined) {
      return res
        .status(404)
        .send(`La medición con id: ${measurementId} no existe en el sensor ${sensorId}`);
    }
    let error = validateMeasurement(req.body);
    if (error) {
      return res.status(400).send(error);
    }
    measurement.valor = req.body.valor;
    measurement.unidad = req.body.unidad;
    if (req.body.momento !== undefined) {
      measurement.momento = new Date(req.body.momento);
    }
    res.status(200).send(measurement);
  })
  // DELETE 204: Elimina la medición del sensor indicado
  .delete((req, res) => {
    let { sensorId, measurementId } = req.params;
    let sensor = findSensor(sensorId);
    if (sensor === undefined) {
      return res.status(404).send(`El sensor con id: ${sensorId} no existe`);
    }
    let index = sensor.mediciones.findIndex((m) => m.id === Number(measurementId));
    if (index === -1) {
      return res
        .status(404)
        .send(`La medición con id: ${measurementId} no existe en el sensor ${sensorId}`);
    }
    sensor.mediciones.splice(index, 1);
    res.status(204).send();
  })
  .all(methodNotAllowed("GET, PUT, DELETE"));

// ---------------------------------------------------------------------------
// Manejo de errores
// ---------------------------------------------------------------------------

// 404 para cualquier URL no definida
app.use((req, res) => {
  res.status(404).send(`El recurso ${req.originalUrl} no existe`);
});

// 400 si el JSON del cuerpo está mal formado; 500 para cualquier otro error
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).send("El cuerpo de la petición no es un JSON válido");
  }
  console.error(err);
  res.status(500).send("Ha ocurrido un error dentro del servidor");
});

// Inicializa el servidor para que escuche en el puerto determinado
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto: ${port}`);
  });
}

module.exports = app;
