(function (raiz) {
  "use strict";

  var UMBRAL_AMARILLO = 800;
  var UMBRAL_ROJO = 1000;
  var CORTE_MIN = 30;

  /* ---------- Logica pura (se prueba con node) ---------- */

  function estadoCO2(ppm, amarillo, rojo) {
    if (ppm >= rojo) return "malo";
    if (ppm >= amarillo) return "regular";
    return "bueno";
  }

  function parseCSV(texto) {
    var lineas = texto.split(/\r?\n/).filter(function (l) {
      return l.trim() !== "";
    });
    if (lineas.length < 2) return [];
    var cab = lineas[0].split(",").map(function (s) {
      return s.trim();
    });
    var iFecha = cab.indexOf("fecha_hora");
    var iAula = cab.indexOf("aula");
    var iCo2 = cab.indexOf("co2_ppm");
    var iTemp = cab.indexOf("temperatura_c");
    var iHum = cab.indexOf("humedad_pct");
    if (iFecha < 0 || iCo2 < 0) return [];
    var filas = [];
    for (var i = 1; i < lineas.length; i++) {
      var c = lineas[i].split(",");
      var t = new Date(c[iFecha]).getTime();
      var co2 = parseInt(c[iCo2], 10);
      if (isNaN(t) || isNaN(co2)) continue;
      filas.push({
        t: t,
        aula: iAula >= 0 ? c[iAula].trim() : "aula",
        co2: co2,
        temp: iTemp >= 0 ? parseFloat(c[iTemp]) : NaN,
        hum: iHum >= 0 ? parseFloat(c[iHum]) : NaN
      });
    }
    return filas;
  }

  function agruparPorAula(filas) {
    var grupos = {};
    filas.forEach(function (f) {
      (grupos[f.aula] = grupos[f.aula] || []).push(f);
    });
    Object.keys(grupos).forEach(function (a) {
      grupos[a].sort(function (x, y) {
        return x.t - y.t;
      });
    });
    return grupos;
  }

  function minutosSobre(filasOrdenadas, umbral) {
    var total = 0;
    for (var i = 0; i < filasOrdenadas.length - 1; i++) {
      var salto = filasOrdenadas[i + 1].t - filasOrdenadas[i].t;
      if (filasOrdenadas[i].co2 >= umbral && salto <= CORTE_MIN * 60000) total += salto;
    }
    return total / 60000;
  }

  function resumen(filas, amarillo, rojo) {
    var grupos = agruparPorAula(filas);
    return Object.keys(grupos)
      .sort()
      .map(function (aula) {
        var g = grupos[aula];
        var suma = 0;
        var max = 0;
        g.forEach(function (f) {
          suma += f.co2;
          if (f.co2 > max) max = f.co2;
        });
        return {
          aula: aula,
          lecturas: g.length,
          promedio: Math.round(suma / g.length),
          maximo: max,
          minAmarillo: Math.round(minutosSobre(g, amarillo)),
          minRojo: Math.round(minutosSobre(g, rojo))
        };
      });
  }

  /* ---------- Interfaz ---------- */

  var TEXTOS = {
    es: {
      titulo: "Monitor de CO2 del aula",
      subtitulo: "Cargá un CSV de mediciones o conectate al dispositivo en vivo.",
      cargar: "Cargar CSV",
      ejemplo: "Ver datos de ejemplo",
      simulado: "Estás viendo datos simulados, no mediciones reales.",
      url: "Dirección del ESP32",
      conectar: "Conectar",
      detener: "Detener",
      umbrales: "Umbrales (ppm)",
      amarillo: "Amarillo",
      rojo: "Rojo",
      ultimo: "Última lectura",
      bueno: "Aire bueno",
      regular: "Conviene ventilar",
      malo: "Ventilá ahora",
      sinDatos: "Sin datos todavía",
      grafico: "Evolución del CO2",
      resumen: "Resumen por aula",
      aula: "Aula",
      lecturas: "Lecturas",
      promedio: "Promedio",
      maximo: "Máximo",
      minSobre: "min ≥ ",
      errorCsv: "No se pudieron leer lecturas en ese archivo. Revisá que tenga las columnas fecha_hora, aula y co2_ppm.",
      errorRed: "No se pudo consultar el dispositivo: ",
      errorEjemplo: "No se pudo abrir el ejemplo. Abrí el panel desde un servidor local (ver README).",
      conectado: "Consultando cada 5 segundos.",
      en_vivo: "en vivo"
    },
    en: {
      titulo: "Classroom CO2 monitor",
      subtitulo: "Load a CSV of measurements or connect to the device live.",
      cargar: "Load CSV",
      ejemplo: "View sample data",
      simulado: "You are viewing simulated data, not real measurements.",
      url: "ESP32 address",
      conectar: "Connect",
      detener: "Stop",
      umbrales: "Thresholds (ppm)",
      amarillo: "Yellow",
      rojo: "Red",
      ultimo: "Latest reading",
      bueno: "Good air",
      regular: "Consider ventilating",
      malo: "Ventilate now",
      sinDatos: "No data yet",
      grafico: "CO2 over time",
      resumen: "Summary by classroom",
      aula: "Classroom",
      lecturas: "Readings",
      promedio: "Average",
      maximo: "Maximum",
      minSobre: "min ≥ ",
      errorCsv: "No readings could be read from that file. Check that it has the columns fecha_hora, aula and co2_ppm.",
      errorRed: "Could not reach the device: ",
      errorEjemplo: "Could not open the sample. Open the panel from a local server (see README).",
      conectado: "Polling every 5 seconds.",
      en_vivo: "live"
    }
  };

  var COLORES_SERIE = ["#378ADD", "#D85A30", "#1D9E75", "#7F77DD", "#BA7517", "#D4537E"];

  function iniciarUI() {
    var estado = {
      lang: (navigator.language || "es").indexOf("en") === 0 ? "en" : "es",
      filas: [],
      simulado: false,
      timer: null,
      mensaje: ""
    };
    var $ = function (id) {
      return document.getElementById(id);
    };
    var t = function (clave) {
      return TEXTOS[estado.lang][clave];
    };

    function umbrales() {
      var a = parseInt($("umbral-amarillo").value, 10);
      var r = parseInt($("umbral-rojo").value, 10);
      return {
        amarillo: isNaN(a) ? UMBRAL_AMARILLO : a,
        rojo: isNaN(r) ? UMBRAL_ROJO : r
      };
    }

    function textoEstatico() {
      document.documentElement.lang = estado.lang;
      document.querySelectorAll("[data-t]").forEach(function (el) {
        el.textContent = t(el.getAttribute("data-t"));
      });
      $("canvas").setAttribute("aria-label", t("grafico"));
    }

    function pintarEstado() {
      var u = umbrales();
      var ultima = estado.filas.length
        ? estado.filas.reduce(function (a, b) {
            return b.t >= a.t ? b : a;
          })
        : null;
      var etiqueta = $("estado-texto");
      var valor = $("estado-valor");
      ["verde", "amarillo", "rojo"].forEach(function (c) {
        $("luz-" + c).classList.remove("activa");
      });
      if (!ultima) {
        valor.textContent = "-";
        etiqueta.textContent = t("sinDatos");
        return;
      }
      var e = estadoCO2(ultima.co2, u.amarillo, u.rojo);
      valor.textContent = ultima.co2 + " ppm";
      etiqueta.textContent = t(e);
      $("luz-" + { bueno: "verde", regular: "amarillo", malo: "rojo" }[e]).classList.add("activa");
    }

    function pintarResumen() {
      var u = umbrales();
      var cuerpo = $("resumen-cuerpo");
      cuerpo.textContent = "";
      $("th-amarillo").textContent = t("minSobre") + u.amarillo;
      $("th-rojo").textContent = t("minSobre") + u.rojo;
      resumen(estado.filas, u.amarillo, u.rojo).forEach(function (f) {
        var tr = document.createElement("tr");
        [f.aula, f.lecturas, f.promedio, f.maximo, f.minAmarillo, f.minRojo].forEach(function (v) {
          var td = document.createElement("td");
          td.textContent = String(v);
          tr.appendChild(td);
        });
        cuerpo.appendChild(tr);
      });
    }

    function dibujar() {
      var canvas = $("canvas");
      var dpr = window.devicePixelRatio || 1;
      var ancho = canvas.clientWidth;
      var alto = canvas.clientHeight;
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);

      var css = getComputedStyle(document.documentElement);
      var colorTexto = css.getPropertyValue("--suave").trim() || "#5F5E5A";
      var colorLinea = css.getPropertyValue("--linea").trim() || "#D3D1C7";
      var u = umbrales();

      var grupos = agruparPorAula(estado.filas);
      var nombres = Object.keys(grupos).sort();
      if (!nombres.length) return;

      var izq = 48, der = 16, arriba = 30, abajo = 34;
      var maxDato = 0;
      var tiempos = [];
      nombres.forEach(function (n) {
        grupos[n].forEach(function (f) {
          if (f.co2 > maxDato) maxDato = f.co2;
          tiempos.push(f.t);
        });
      });
      tiempos = Array.from(new Set(tiempos)).sort(function (a, b) {
        return a - b;
      });

      // Eje X comprimido: los cortes largos (noches, fines de semana) no ocupan lugar.
      var acumulado = new Map();
      var acc = 0;
      tiempos.forEach(function (tt, i) {
        if (i > 0) acc += Math.min(tt - tiempos[i - 1], CORTE_MIN * 60000);
        acumulado.set(tt, acc);
      });
      var totalX = acc || 1;
      var paso = Math.ceil(Math.max(maxDato, u.rojo * 1.2) / 5 / 100) * 100;
      var maxV = paso * 5;

      function px(tt) {
        return izq + (acumulado.get(tt) / totalX) * (ancho - izq - der);
      }
      function py(v) {
        return alto - abajo - (v / maxV) * (alto - arriba - abajo);
      }

      ctx.font = "12px sans-serif";
      ctx.lineWidth = 1;
      ctx.strokeStyle = colorLinea;
      ctx.fillStyle = colorTexto;
      ctx.textAlign = "right";
      for (var v = 0; v <= maxV; v += paso) {
        ctx.beginPath();
        ctx.moveTo(izq, py(v));
        ctx.lineTo(ancho - der, py(v));
        ctx.stroke();
        ctx.fillText(String(v), izq - 6, py(v) + 4);
      }

      // Separadores y etiquetas de dia.
      ctx.textAlign = "left";
      var diaAnterior = "";
      tiempos.forEach(function (tt, i) {
        var fecha = new Date(tt);
        var dia = fecha.toDateString();
        if (dia !== diaAnterior) {
          if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(px(tt), arriba);
            ctx.lineTo(px(tt), alto - abajo);
            ctx.stroke();
          }
          ctx.fillText(
            fecha.toLocaleDateString(estado.lang, { weekday: "short", day: "2-digit", month: "2-digit" }),
            px(tt) + 4,
            alto - abajo + 16
          );
          diaAnterior = dia;
        }
      });

      // Umbrales.
      [
        [u.amarillo, "#BA7517"],
        [u.rojo, "#A32D2D"]
      ].forEach(function (par) {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = par[1];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(izq, py(par[0]));
        ctx.lineTo(ancho - der, py(par[0]));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = par[1];
        ctx.textAlign = "right";
        ctx.fillText(par[0] + " ppm", ancho - der - 4, py(par[0]) - 5);
        ctx.restore();
      });

      // Series.
      nombres.forEach(function (n, idx) {
        var color = COLORES_SERIE[idx % COLORES_SERIE.length];
        var puntos = grupos[n];
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        puntos.forEach(function (f, i) {
          var corte = i === 0 || f.t - puntos[i - 1].t > CORTE_MIN * 60000;
          if (corte) ctx.moveTo(px(f.t), py(f.co2));
          else ctx.lineTo(px(f.t), py(f.co2));
        });
        ctx.stroke();
      });

      // Leyenda.
      var x = izq;
      ctx.lineWidth = 2;
      ctx.textAlign = "left";
      nombres.forEach(function (n, idx) {
        var color = COLORES_SERIE[idx % COLORES_SERIE.length];
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, 14);
        ctx.lineTo(x + 18, 14);
        ctx.stroke();
        ctx.fillStyle = colorTexto;
        ctx.fillText(n, x + 24, 18);
        x += 24 + ctx.measureText(n).width + 18;
      });
    }

    function pintarMensaje() {
      $("mensaje").textContent = estado.mensaje;
      $("aviso-simulado").hidden = !estado.simulado;
    }

    function refrescar() {
      textoEstatico();
      pintarEstado();
      pintarResumen();
      pintarMensaje();
      dibujar();
    }

    function cargarTexto(texto, simulado) {
      var filas = parseCSV(texto);
      if (!filas.length) {
        estado.mensaje = t("errorCsv");
      } else {
        estado.filas = filas;
        estado.simulado = !!simulado;
        estado.mensaje = "";
      }
      refrescar();
    }

    function detener() {
      if (estado.timer) clearInterval(estado.timer);
      estado.timer = null;
      $("btn-detener").disabled = true;
      $("btn-conectar").disabled = false;
    }

    function consultar(base) {
      fetch(base + "/datos.json")
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (d) {
          estado.filas.push({
            t: Date.now(),
            aula: t("en_vivo"),
            co2: d.co2_ppm,
            temp: d.temperatura_c,
            hum: d.humedad_pct
          });
          if (estado.filas.length > 1440) estado.filas.shift();
          estado.mensaje = t("conectado");
          refrescar();
        })
        .catch(function (e) {
          estado.mensaje = t("errorRed") + e.message;
          pintarMensaje();
        });
    }

    function conectar() {
      var base = $("url").value.trim().replace(/\/+$/, "");
      if (!base) return;
      if (!/^https?:\/\//.test(base)) base = "http://" + base;
      estado.filas = [];
      estado.simulado = false;
      detener();
      $("btn-conectar").disabled = true;
      $("btn-detener").disabled = false;
      consultar(base);
      estado.timer = setInterval(function () {
        consultar(base);
      }, 5000);
    }

    $("archivo").addEventListener("change", function (ev) {
      var archivo = ev.target.files[0];
      if (!archivo) return;
      detener();
      var lector = new FileReader();
      lector.onload = function () {
        cargarTexto(String(lector.result), false);
      };
      lector.readAsText(archivo);
    });
    $("btn-ejemplo").addEventListener("click", function () {
      detener();
      fetch("../datos/ejemplo.csv")
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .then(function (texto) {
          cargarTexto(texto, true);
        })
        .catch(function () {
          estado.mensaje = t("errorEjemplo");
          pintarMensaje();
        });
    });
    $("btn-conectar").addEventListener("click", conectar);
    $("btn-detener").addEventListener("click", detener);
    $("umbral-amarillo").addEventListener("input", refrescar);
    $("umbral-rojo").addEventListener("input", refrescar);
    $("idioma").addEventListener("change", function (ev) {
      estado.lang = ev.target.value;
      estado.mensaje = "";
      refrescar();
    });
    window.addEventListener("resize", dibujar);

    $("idioma").value = estado.lang;
    $("btn-detener").disabled = true;
    refrescar();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", iniciarUI);
  }

  raiz.PanelCO2 = {
    estadoCO2: estadoCO2,
    parseCSV: parseCSV,
    agruparPorAula: agruparPorAula,
    minutosSobre: minutosSobre,
    resumen: resumen
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = raiz.PanelCO2;
  }
})(typeof window !== "undefined" ? window : globalThis);
