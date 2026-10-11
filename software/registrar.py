#!/usr/bin/env python3
"""Lee las lineas CSV que imprime el ESP32 por serial y las guarda con fecha, hora y aula.

Uso:
    python software/registrar.py --puerto COM3 --aula 3B
    python software/registrar.py --puerto /dev/ttyUSB0 --aula biblioteca --salida datos/lecturas.csv
"""

import argparse
import csv
import sys
from datetime import datetime
from pathlib import Path

CABECERA = ["fecha_hora", "aula", "co2_ppm", "temperatura_c", "humedad_pct"]


def parsear_linea(linea):
    """Convierte 'tiempo_ms,co2,temp,hum' en (co2, temp, hum). Devuelve None si no es una lectura."""
    linea = linea.strip()
    if not linea or linea.startswith("#") or linea.startswith("tiempo_ms"):
        return None
    partes = linea.split(",")
    if len(partes) != 4:
        return None
    try:
        co2 = int(partes[1])
        temperatura = float(partes[2])
        humedad = float(partes[3])
    except ValueError:
        return None
    # El SCD40 mide de 0 a 40000 ppm; fuera de estos rangos la linea esta danada.
    if not (0 <= co2 <= 40000 and -10.0 <= temperatura <= 60.0 and 0.0 <= humedad <= 100.0):
        return None
    return co2, temperatura, humedad


def abrir_csv(ruta):
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    nuevo = not ruta.exists() or ruta.stat().st_size == 0
    archivo = ruta.open("a", newline="", encoding="utf-8")
    escritor = csv.writer(archivo)
    if nuevo:
        escritor.writerow(CABECERA)
        archivo.flush()
    return archivo, escritor


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--puerto", required=True, help="Puerto serie (COM3, /dev/ttyUSB0, ...)")
    parser.add_argument("--aula", default="aula-1", help="Nombre del aula donde esta el dispositivo")
    parser.add_argument("--baudios", type=int, default=115200)
    parser.add_argument("--salida", default="datos/lecturas.csv")
    args = parser.parse_args()

    try:
        import serial
    except ImportError:
        sys.exit("Falta pyserial: pip install -r software/requirements.txt")

    archivo, escritor = abrir_csv(args.salida)
    print(f"Registrando el aula {args.aula} en {args.salida}. Ctrl+C para detener.")
    try:
        with serial.Serial(args.puerto, args.baudios, timeout=10) as puerto:
            while True:
                linea = puerto.readline().decode("utf-8", errors="ignore")
                lectura = parsear_linea(linea)
                if lectura is None:
                    continue
                marca = datetime.now().isoformat(timespec="seconds")
                escritor.writerow([marca, args.aula, lectura[0], f"{lectura[1]:.1f}", f"{lectura[2]:.1f}"])
                archivo.flush()
                print(f"{marca}  {lectura[0]} ppm  {lectura[1]:.1f} C  {lectura[2]:.1f} %")
    except KeyboardInterrupt:
        print("\nRegistro detenido.")
    except serial.SerialException as error:
        sys.exit(f"Error de puerto serie: {error}")
    finally:
        archivo.close()


if __name__ == "__main__":
    main()
