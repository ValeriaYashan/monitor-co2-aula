// Pruebas de la logica del panel. Se ejecutan con: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const panel = require("../panel/app.js");

test("estadoCO2 respeta los umbrales", () => {
  assert.strictEqual(panel.estadoCO2(450, 800, 1000), "bueno");
  assert.strictEqual(panel.estadoCO2(799, 800, 1000), "bueno");
  assert.strictEqual(panel.estadoCO2(800, 800, 1000), "regular");
  assert.strictEqual(panel.estadoCO2(1000, 800, 1000), "malo");
});

test("parseCSV lee filas validas y descarta las danadas", () => {
  const texto = [
    "fecha_hora,aula,co2_ppm,temperatura_c,humedad_pct",
    "2026-10-05T08:00:00,3A,640,20.1,50.2",
    "2026-10-05T08:05:00,3A,abc,20.1,50.2",
    "fecha-invalida,3A,700,20.1,50.2",
    ""
  ].join("\n");
  const filas = panel.parseCSV(texto);
  assert.strictEqual(filas.length, 1);
  assert.strictEqual(filas[0].co2, 640);
  assert.strictEqual(filas[0].aula, "3A");
});

test("parseCSV devuelve vacio si faltan columnas obligatorias", () => {
  assert.deepStrictEqual(panel.parseCSV("a,b\n1,2"), []);
});

test("minutosSobre cuenta intervalos y descarta cortes largos", () => {
  const base = new Date("2026-10-05T08:00:00").getTime();
  const min = 60000;
  const filas = [
    { t: base, co2: 1100 },
    { t: base + 5 * min, co2: 1100 },
    { t: base + 10 * min, co2: 600 },
    { t: base + 15 * min, co2: 500 }
  ];
  assert.strictEqual(panel.minutosSobre(filas, 1000), 10);
  const corte = [
    { t: base, co2: 1500 },
    { t: base + 600 * min, co2: 1500 }
  ];
  assert.strictEqual(panel.minutosSobre(corte, 1000), 0);
});

test("el resumen del ejemplo coincide con el de Python (software/analizar.py)", () => {
  const ruta = path.join(__dirname, "..", "datos", "ejemplo.csv");
  const filas = panel.parseCSV(fs.readFileSync(ruta, "utf-8"));
  const r = {};
  panel.resumen(filas, 800, 1000).forEach((f) => (r[f.aula] = f));
  assert.deepStrictEqual(Object.keys(r).sort(), ["3A-ventilada", "3B-cerrada", "3C-intermedia"]);
  assert.strictEqual(r["3A-ventilada"].lecturas, 335);
  assert.strictEqual(r["3A-ventilada"].promedio, 773);
  assert.strictEqual(r["3A-ventilada"].maximo, 876);
  assert.strictEqual(r["3A-ventilada"].minAmarillo, 1130);
  assert.strictEqual(r["3A-ventilada"].minRojo, 0);
  assert.strictEqual(r["3B-cerrada"].promedio, 1644);
  assert.strictEqual(r["3B-cerrada"].maximo, 2012);
  assert.strictEqual(r["3B-cerrada"].minAmarillo, 1600);
  assert.strictEqual(r["3B-cerrada"].minRojo, 1550);
  assert.strictEqual(r["3C-intermedia"].promedio, 1082);
  assert.strictEqual(r["3C-intermedia"].maximo, 1401);
  assert.strictEqual(r["3C-intermedia"].minAmarillo, 1350);
  assert.strictEqual(r["3C-intermedia"].minRojo, 1100);
});
