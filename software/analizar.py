#!/usr/bin/env python3
"""Resume y grafica las mediciones de CO2 de una o varias aulas.

Uso:
    python software/analizar.py datos/ejemplo.csv --salida grafico.png
    python software/analizar.py datos/aula1.csv datos/aula2.csv --resumen resumen.csv
"""

import argparse
import csv
import math
import sys
from collections import defaultdict
from datetime import datetime, timedelta

import matplotlib

UMBRAL_AMARILLO = 800
UMBRAL_ROJO = 1000
# Si entre dos lecturas pasa mas tiempo que esto, se considera un corte (noche, fin de semana).
CORTE_MINUTOS = 30

PALETA = ["#378ADD", "#D85A30", "#1D9E75", "#7F77DD", "#BA7517", "#D4537E"]


def leer_csv(ruta):
    """Devuelve una lista de diccionarios con fecha, aula, co2, temperatura y humedad."""
    filas = []
    with open(ruta, newline="", encoding="utf-8") as archivo:
        for fila in csv.DictReader(archivo):
            try:
                filas.append(
                    {
                        "fecha": datetime.fromisoformat(fila["fecha_hora"]),
                        "aula": fila["aula"],
                        "co2": int(fila["co2_ppm"]),
                        "temperatura": float(fila["temperatura_c"]),
                        "humedad": float(fila["humedad_pct"]),
                    }
                )
            except (KeyError, ValueError):
                continue
    return filas


def agrupar_por_aula(filas):
    grupos = defaultdict(list)
    for fila in filas:
        grupos[fila["aula"]].append(fila)
    for lista in grupos.values():
        lista.sort(key=lambda f: f["fecha"])
    return dict(grupos)


def minutos_sobre_umbral(filas_ordenadas, umbral, corte_minutos=CORTE_MINUTOS):
    """Suma el tiempo en que el CO2 estuvo en o sobre el umbral.

    Cada lectura cubre el intervalo hasta la siguiente; si el salto supera
    `corte_minutos` no se cuenta (por ejemplo, la noche entre dos dias).
    """
    total = timedelta()
    for actual, siguiente in zip(filas_ordenadas, filas_ordenadas[1:]):
        salto = siguiente["fecha"] - actual["fecha"]
        if actual["co2"] >= umbral and salto <= timedelta(minutes=corte_minutos):
            total += salto
    return total.total_seconds() / 60.0


def resumen_por_aula(grupos, amarillo=UMBRAL_AMARILLO, rojo=UMBRAL_ROJO):
    resultado = []
    for aula, filas in sorted(grupos.items()):
        valores = [f["co2"] for f in filas]
        resultado.append(
            {
                "aula": aula,
                "lecturas": len(valores),
                "promedio_ppm": round(sum(valores) / len(valores)),
                "maximo_ppm": max(valores),
                "min_sobre_amarillo": round(minutos_sobre_umbral(filas, amarillo)),
                "min_sobre_rojo": round(minutos_sobre_umbral(filas, rojo)),
            }
        )
    return resultado


def imprimir_resumen(resumen, amarillo, rojo):
    print(f"{'aula':<14}{'lecturas':>9}{'promedio':>10}{'maximo':>8}{f'min >={amarillo}':>12}{f'min >={rojo}':>12}")
    for fila in resumen:
        print(
            f"{fila['aula']:<14}{fila['lecturas']:>9}{fila['promedio_ppm']:>10}{fila['maximo_ppm']:>8}"
            f"{fila['min_sobre_amarillo']:>12}{fila['min_sobre_rojo']:>12}"
        )


def guardar_resumen(resumen, ruta):
    with open(ruta, "w", newline="", encoding="utf-8") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=list(resumen[0].keys()))
        escritor.writeheader()
        escritor.writerows(resumen)


def serie_con_cortes(filas, corte_minutos=CORTE_MINUTOS):
    """Arma x e y insertando NaN donde hay un corte, para que la linea no una los dias."""
    xs, ys = [], []
    for i, fila in enumerate(filas):
        if i > 0 and fila["fecha"] - filas[i - 1]["fecha"] > timedelta(minutes=corte_minutos):
            xs.append(filas[i - 1]["fecha"] + timedelta(minutes=1))
            ys.append(math.nan)
        xs.append(fila["fecha"])
        ys.append(fila["co2"])
    return xs, ys


def perfil_horario(filas, redondeo_min=5):
    """Agrupa las lecturas por hora del dia (en bloques de `redondeo_min` minutos).

    Devuelve una lista ordenada de (minuto_del_dia, promedio, minimo, maximo), lo que
    permite superponer varios dias y comparar el comportamiento tipico de cada aula.
    """
    bloques = defaultdict(list)
    for fila in filas:
        minuto = fila["fecha"].hour * 60 + fila["fecha"].minute
        bloques[minuto - minuto % redondeo_min].append(fila["co2"])
    return [
        (minuto, sum(valores) / len(valores), min(valores), max(valores))
        for minuto, valores in sorted(bloques.items())
    ]


def graficar(grupos, salida, amarillo, rojo, mostrar, modo="perfil"):
    if not mostrar:
        matplotlib.use("Agg")
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt

    fig, eje = plt.subplots(figsize=(11, 4.8), dpi=150)
    for indice, (aula, filas) in enumerate(sorted(grupos.items())):
        color = PALETA[indice % len(PALETA)]
        if modo == "perfil":
            perfil = perfil_horario(filas)
            horas = [p[0] / 60 for p in perfil]
            eje.plot(horas, [p[1] for p in perfil], color=color, linewidth=1.8, label=aula)
            eje.fill_between(horas, [p[2] for p in perfil], [p[3] for p in perfil], color=color, alpha=0.15)
        else:
            xs, ys = serie_con_cortes(filas)
            eje.plot(xs, ys, color=color, linewidth=1.4, label=aula)

    eje.axhline(amarillo, color="#BA7517", linestyle="--", linewidth=1, label=f"{amarillo} ppm")
    eje.axhline(rojo, color="#A32D2D", linestyle="--", linewidth=1, label=f"{rojo} ppm")
    eje.set_ylabel("CO2 (ppm)")
    eje.grid(True, alpha=0.25)
    if modo == "perfil":
        eje.set_title("CO2 por hora del día (promedio y rango entre días)", pad=28)
        eje.set_xlabel("Hora del día")
        eje.xaxis.set_major_formatter(lambda valor, _: f"{int(valor):02d}:{int(round((valor % 1) * 60)):02d}")
    else:
        eje.set_title("CO2 en las aulas", pad=28)
        eje.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m %H:%M"))
        fig.autofmt_xdate()
    eje.legend(loc="lower center", bbox_to_anchor=(0.5, 1.0), ncol=5, frameon=False)
    fig.tight_layout()

    if salida:
        fig.savefig(salida)
        print(f"Grafico guardado en {salida}")
    if mostrar:
        plt.show()
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("entradas", nargs="+", help="Uno o mas CSV generados por registrar.py")
    parser.add_argument("--salida", default="grafico.png")
    parser.add_argument("--resumen", help="Guardar la tabla resumen en este CSV")
    parser.add_argument("--amarillo", type=int, default=UMBRAL_AMARILLO)
    parser.add_argument("--rojo", type=int, default=UMBRAL_ROJO)
    parser.add_argument(
        "--modo",
        choices=["perfil", "serie"],
        default="perfil",
        help="perfil: superpone los dias por hora; serie: linea de tiempo completa",
    )
    parser.add_argument("--mostrar", action="store_true", help="Abrir la ventana del grafico")
    args = parser.parse_args()

    filas = []
    for ruta in args.entradas:
        try:
            filas.extend(leer_csv(ruta))
        except FileNotFoundError:
            sys.exit(f"No existe {ruta}. Generalo con registrar.py o usa datos/ejemplo.csv.")
    if not filas:
        sys.exit("No hay lecturas validas para analizar.")

    grupos = agrupar_por_aula(filas)
    resumen = resumen_por_aula(grupos, args.amarillo, args.rojo)
    imprimir_resumen(resumen, args.amarillo, args.rojo)
    if args.resumen:
        guardar_resumen(resumen, args.resumen)
        print(f"Resumen guardado en {args.resumen}")
    graficar(grupos, args.salida, args.amarillo, args.rojo, args.mostrar, args.modo)


if __name__ == "__main__":
    main()
