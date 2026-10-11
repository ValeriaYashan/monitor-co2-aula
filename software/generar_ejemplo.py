#!/usr/bin/env python3
"""Genera datos/ejemplo.csv con una semana simulada de tres aulas.

Los valores son SIMULADOS con un modelo simple de balance de CO2 (personas que
respiran y renovacion de aire). No son mediciones reales: sirven para probar el
analisis y el panel sin hardware.
"""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

SALIDA = Path(__file__).resolve().parent.parent / "datos" / "ejemplo.csv"

CO2_EXTERIOR = 420.0
VOLUMEN_M3 = 170.0
ESTUDIANTES = 25
GENERACION_M3_H = 0.012  # CO2 emitido por persona y por hora (valor aproximado)
PASO_MIN = 5

# Renovaciones de aire por hora con las ventanas como las dejan en cada aula.
AULAS = {"3A-ventilada": 4.0, "3B-cerrada": 1.0, "3C-intermedia": 1.8}

# Bloques de la jornada: (hora_inicio, hora_fin, hay_alumnos)
JORNADA = [
    ((7, 30), (9, 40), True),
    ((9, 40), (10, 0), False),
    ((10, 0), (11, 30), True),
    ((11, 30), (11, 50), False),
    ((11, 50), (13, 0), True),
]


def hay_alumnos(hora, minuto):
    actual = hora * 60 + minuto
    for (h1, m1), (h2, m2), ocupado in JORNADA:
        if h1 * 60 + m1 <= actual < h2 * 60 + m2:
            return ocupado
    return False


def simular_dia(dia, renovaciones, azar):
    filas = []
    co2 = CO2_EXTERIOR + 30.0
    momento = datetime(dia.year, dia.month, dia.day, 7, 30)
    fin = datetime(dia.year, dia.month, dia.day, 13, 0)
    while momento <= fin:
        ocupado = hay_alumnos(momento.hour, momento.minute)
        renov = renovaciones
        if not ocupado:
            renov += 4.0 if renovaciones > 1.0 else 0.5  # se abren ventanas en los recreos
        generacion_ppm_h = (ESTUDIANTES * GENERACION_M3_H / VOLUMEN_M3) * 1e6 if ocupado else 0.0
        variacion_h = generacion_ppm_h - renov * (co2 - CO2_EXTERIOR)
        co2 += variacion_h * PASO_MIN / 60.0
        medido = round(co2 + azar.uniform(-15, 15))
        temperatura = 18.0 + (co2 - CO2_EXTERIOR) / 700.0 + azar.uniform(-0.2, 0.2)
        humedad = 55.0 - (co2 - CO2_EXTERIOR) / 600.0 + azar.uniform(-1.0, 1.0)
        filas.append([momento.isoformat(timespec="seconds"), medido, f"{temperatura:.1f}", f"{humedad:.1f}"])
        momento += timedelta(minutes=PASO_MIN)
    return filas


def main():
    azar = random.Random(11)
    lunes = datetime(2026, 10, 5)
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    with SALIDA.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["fecha_hora", "aula", "co2_ppm", "temperatura_c", "humedad_pct"])
        for nombre, renovaciones in AULAS.items():
            for dia_semana in range(5):
                dia = lunes + timedelta(days=dia_semana)
                for fila in simular_dia(dia, renovaciones, azar):
                    escritor.writerow([fila[0], nombre, fila[1], fila[2], fila[3]])
    print(f"Generado {SALIDA}")


if __name__ == "__main__":
    main()
