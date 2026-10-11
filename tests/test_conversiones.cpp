// Pruebas de las funciones puras del firmware. Se compilan en una PC:
//   g++ -std=c++17 -o prueba_conversiones tests/test_conversiones.cpp && ./prueba_conversiones

#include <cassert>
#include <cmath>
#include <cstdio>

#include "../firmware/src/conversiones.h"

static bool casiIgual(float a, float b, float tolerancia = 0.01f) {
  return std::fabs(a - b) <= tolerancia;
}

int main() {
  // Ejemplo de la hoja de datos de Sensirion.
  const uint8_t ejemplo[2] = {0xBE, 0xEF};
  assert(sensirionCrc8(ejemplo, 2) == 0x92);

  assert(casiIgual(scd4xTemperaturaC(0), -45.0f));
  assert(casiIgual(scd4xTemperaturaC(65535), 130.0f));
  assert(casiIgual(scd4xHumedadPct(0), 0.0f));
  assert(casiIgual(scd4xHumedadPct(65535), 100.0f));

  assert(clasificarCo2(450, 800, 1000) == AIRE_BUENO);
  assert(clasificarCo2(799, 800, 1000) == AIRE_BUENO);
  assert(clasificarCo2(800, 800, 1000) == AIRE_REGULAR);
  assert(clasificarCo2(999, 800, 1000) == AIRE_REGULAR);
  assert(clasificarCo2(1000, 800, 1000) == AIRE_MALO);
  assert(clasificarCo2(2500, 800, 1000) == AIRE_MALO);

  std::puts("conversiones: todas las pruebas pasaron");
  return 0;
}
