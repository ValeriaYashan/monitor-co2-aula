import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "software"))

from analizar import (  # noqa: E402
    agrupar_por_aula,
    leer_csv,
    minutos_sobre_umbral,
    perfil_horario,
    resumen_por_aula,
    serie_con_cortes,
)
from registrar import parsear_linea  # noqa: E402

EJEMPLO = Path(__file__).resolve().parent.parent / "datos" / "ejemplo.csv"


def fila(hora, minuto, co2, dia=5):
    return {"fecha": datetime(2026, 10, dia, hora, minuto), "aula": "x", "co2": co2, "temperatura": 20.0, "humedad": 50.0}


def test_parsear_linea_valida():
    assert parsear_linea("12000,845,22.4,48.1\n") == (845, 22.4, 48.1)


def test_parsear_linea_ignora_cabecera_y_mensajes():
    assert parsear_linea("tiempo_ms,co2_ppm,temperatura_c,humedad_pct") is None
    assert parsear_linea("# error de lectura del SCD40") is None
    assert parsear_linea("") is None


def test_parsear_linea_ignora_basura_y_fuera_de_rango():
    assert parsear_linea("12000,abc,22.4,48.1") is None
    assert parsear_linea("12000,845,22.4") is None
    assert parsear_linea("12000,50000,22.4,48.1") is None
    assert parsear_linea("12000,845,99.0,48.1") is None
    assert parsear_linea("12000,845,22.4,140.0") is None


def test_minutos_sobre_umbral():
    # 10 minutos en 1100 ppm y luego baja: cuentan 10 minutos sobre 1000.
    filas = [fila(8, 0, 1100), fila(8, 5, 1100), fila(8, 10, 600), fila(8, 15, 500)]
    assert minutos_sobre_umbral(filas, 1000) == 10


def test_minutos_sobre_umbral_ignora_cortes_largos():
    filas = [fila(12, 0, 1500), fila(8, 0, 1500, dia=6)]
    assert minutos_sobre_umbral(filas, 1000) == 0


def test_serie_con_cortes_inserta_nan():
    filas = [fila(12, 0, 700), fila(12, 5, 710), fila(8, 0, 650, dia=6)]
    xs, ys = serie_con_cortes(filas)
    assert len(xs) == len(ys) == 4
    assert ys[2] != ys[2]  # NaN


def test_perfil_horario_promedia_dias_en_el_mismo_horario():
    filas = [fila(8, 0, 600, dia=5), fila(8, 2, 800, dia=6), fila(8, 5, 900, dia=5)]
    perfil = perfil_horario(filas, redondeo_min=5)
    assert perfil == [(480, 700.0, 600, 800), (485, 900.0, 900, 900)]


def test_ejemplo_tiene_tres_aulas_y_cerrada_supera_a_ventilada():
    grupos = agrupar_por_aula(leer_csv(EJEMPLO))
    assert set(grupos) == {"3A-ventilada", "3B-cerrada", "3C-intermedia"}
    resumen = {fila["aula"]: fila for fila in resumen_por_aula(grupos)}
    assert resumen["3B-cerrada"]["maximo_ppm"] > resumen["3A-ventilada"]["maximo_ppm"]
    assert resumen["3B-cerrada"]["min_sobre_rojo"] > resumen["3A-ventilada"]["min_sobre_rojo"]
