#pragma once

// Bus I2C del sensor SCD40 (pines por defecto del ESP32 DevKit).
#define PIN_SDA 21
#define PIN_SCL 22

// LEDs del semaforo (cada uno con una resistencia de 220 ohm hacia GND).
#define PIN_LED_VERDE 25
#define PIN_LED_AMARILLO 26
#define PIN_LED_ROJO 27

// Umbrales de CO2 en ppm. Son valores de referencia editables: conviene que
// el curso los discuta y cite la fuente que adopte.
#define UMBRAL_AMARILLO_PPM 800
#define UMBRAL_ROJO_PPM 1000

// Wi-Fi opcional: con 1 el ESP32 expone los datos en http://<ip>/datos.json.
// Las credenciales van en src/secrets.h (copiar secrets.example.h). Ese
// archivo esta en .gitignore para no subir contrasenas al repositorio.
#define USAR_WIFI 0

#if USAR_WIFI
#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Falta src/secrets.h: copia secrets.example.h y completa tus datos."
#endif
#endif
