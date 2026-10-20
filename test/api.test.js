// Pruebas de la API RESTful usando el runner nativo de Node.js (node --test)
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const app = require("../index.js");

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

test("GET / responde con el mensaje guía", async () => {
  const r = await fetch(`${base}/`);
  assert.strictEqual(r.status, 200);
  assert.match(await r.text(), /sensores/);
});

test("GET /sensores retorna el sensor de ejemplo con 2 mediciones", async () => {
  const r = await fetch(`${base}/sensores`);
  assert.strictEqual(r.status, 200);
  const data = await r.json();
  assert.strictEqual(data[0].id, 0);
  assert.strictEqual(data[0].mediciones.length, 2);
});

test("CRUD completo de sensores", async () => {
  // POST
  let r = await fetch(`${base}/sensores`, json("POST", { nombre: "Sensor de Humedad" }));
  assert.strictEqual(r.status, 201);
  const creado = await r.json();
  assert.strictEqual(creado.id, 1);
  assert.deepStrictEqual(creado.mediciones, []);

  // GET por id
  r = await fetch(`${base}/sensores/1`);
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).nombre, "Sensor de Humedad");

  // GET con query
  r = await fetch(`${base}/sensores?nombre=humedad`);
  assert.strictEqual((await r.json()).length, 1);

  // PUT
  r = await fetch(`${base}/sensores/1`, json("PUT", { nombre: "Sensor de Humedad - Lab 2" }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).nombre, "Sensor de Humedad - Lab 2");

  // DELETE
  r = await fetch(`${base}/sensores/1`, { method: "DELETE" });
  assert.strictEqual(r.status, 204);
  r = await fetch(`${base}/sensores/1`);
  assert.strictEqual(r.status, 404);
});

test("CRUD completo de mediciones", async () => {
  // POST (el mismo body de la guía)
  let r = await fetch(
    `${base}/sensores/0/mediciones`,
    json("POST", { momento: "2020-10-23T20:51:39.720Z", valor: 27.8, unidad: "ºC" })
  );
  assert.strictEqual(r.status, 201);
  const m = await r.json();
  assert.strictEqual(m.id, 2);
  assert.strictEqual(m.valor, 27.8);

  // GET todas
  r = await fetch(`${base}/sensores/0/mediciones`);
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).length, 3);

  // GET con query por rango de fechas
  r = await fetch(`${base}/sensores/0/mediciones?hasta=2021-01-01T00:00:00Z`);
  assert.strictEqual((await r.json()).length, 1);

  // GET una
  r = await fetch(`${base}/sensores/0/mediciones/2`);
  assert.strictEqual(r.status, 200);

  // PUT
  r = await fetch(`${base}/sensores/0/mediciones/2`, json("PUT", { valor: 30.1, unidad: "ºC" }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).valor, 30.1);

  // DELETE
  r = await fetch(`${base}/sensores/0/mediciones/2`, { method: "DELETE" });
  assert.strictEqual(r.status, 204);
  r = await fetch(`${base}/sensores/0/mediciones/2`);
  assert.strictEqual(r.status, 404);
});

test("Códigos de error 400, 404 y 405", async () => {
  // 400: falta nombre
  let r = await fetch(`${base}/sensores`, json("POST", {}));
  assert.strictEqual(r.status, 400);
  // 400: valor no numérico
  r = await fetch(`${base}/sensores/0/mediciones`, json("POST", { valor: "x", unidad: "ºC" }));
  assert.strictEqual(r.status, 400);
  // 400: JSON mal formado
  r = await fetch(`${base}/sensores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{nombre:",
  });
  assert.strictEqual(r.status, 400);
  // 404: sensor inexistente
  r = await fetch(`${base}/sensores/99/mediciones`);
  assert.strictEqual(r.status, 404);
  // 404: ruta inexistente
  r = await fetch(`${base}/otra-cosa`);
  assert.strictEqual(r.status, 404);
  // 405: DELETE sobre la colección
  r = await fetch(`${base}/sensores`, { method: "DELETE" });
  assert.strictEqual(r.status, 405);
  assert.strictEqual(r.headers.get("allow"), "GET, POST");
});
