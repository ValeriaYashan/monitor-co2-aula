#pragma once

// Funciones puras (sin dependencias de Arduino) para poder probarlas en una PC.

#include <stdint.h>

// CRC-8 de Sensirion: polinomio 0x31, valor inicial 0xFF.
// Ejemplo de la hoja de datos: los bytes 0xBE 0xEF dan 0x92.
inline uint8_t sensirionCrc8(const uint8_t *datos, int largo) {
  uint8_t crc = 0xFF;
  for (int i = 0; i < largo; i++) {
    crc ^= datos[i];
    for (int bit = 0; bit < 8; bit++) {
      crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x31) : (uint8_t)(crc << 1);
    }
  }
  return crc;
}

// Conversiones del SCD4x segun la hoja de datos del fabricante.
inline float scd4xTemperaturaC(uint16_t crudo) {
  return -45.0f + 175.0f * (float)crudo / 65535.0f;
}

inline float scd4xHumedadPct(uint16_t crudo) {
  return 100.0f * (float)crudo / 65535.0f;
}

enum EstadoAire { AIRE_BUENO = 0, AIRE_REGULAR = 1, AIRE_MALO = 2 };

inline EstadoAire clasificarCo2(uint16_t ppm, uint16_t umbralAmarillo, uint16_t umbralRojo) {
  if (ppm >= umbralRojo) return AIRE_MALO;
  if (ppm >= umbralAmarillo) return AIRE_REGULAR;
  return AIRE_BUENO;
}

inline const char *nombreEstado(EstadoAire estado) {
  switch (estado) {
    case AIRE_MALO:
      return "malo";
    case AIRE_REGULAR:
      return "regular";
    default:
      return "bueno";
  }
}
