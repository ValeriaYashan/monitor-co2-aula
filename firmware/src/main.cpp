#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "conversiones.h"

#if USAR_WIFI
#include <WebServer.h>
#include <WiFi.h>
#endif

// Comandos del SCD4x (hoja de datos de Sensirion).
static const uint8_t DIR_SCD4X = 0x62;
static const uint16_t CMD_INICIAR_MEDICION = 0x21B1;
static const uint16_t CMD_DETENER_MEDICION = 0x3F86;
static const uint16_t CMD_LEER_MEDICION = 0xEC05;
static const uint16_t CMD_DATOS_LISTOS = 0xE4B8;

static uint16_t ultimoCo2 = 0;
static float ultimaTemperatura = NAN;
static float ultimaHumedad = NAN;
static EstadoAire ultimoEstado = AIRE_BUENO;
static unsigned long ultimaMedicion = 0;
static bool hayMedicion = false;
static unsigned long ultimaConsulta = 0;

static bool enviarComando(uint16_t comando) {
  Wire.beginTransmission(DIR_SCD4X);
  Wire.write((uint8_t)(comando >> 8));
  Wire.write((uint8_t)(comando & 0xFF));
  return Wire.endTransmission() == 0;
}

static bool leerBytes(uint8_t *destino, int cantidad) {
  if (Wire.requestFrom((int)DIR_SCD4X, cantidad) != cantidad) {
    return false;
  }
  for (int i = 0; i < cantidad; i++) {
    destino[i] = Wire.read();
  }
  return true;
}

static bool datosListos() {
  uint8_t b[3];
  if (!enviarComando(CMD_DATOS_LISTOS)) return false;
  delay(1);
  if (!leerBytes(b, 3)) return false;
  if (sensirionCrc8(b, 2) != b[2]) return false;
  uint16_t palabra = ((uint16_t)b[0] << 8) | b[1];
  return (palabra & 0x07FF) != 0;
}

static bool leerMedicion(uint16_t &co2, float &temperatura, float &humedad) {
  uint8_t b[9];
  if (!enviarComando(CMD_LEER_MEDICION)) return false;
  delay(1);
  if (!leerBytes(b, 9)) return false;
  for (int i = 0; i < 9; i += 3) {
    if (sensirionCrc8(&b[i], 2) != b[i + 2]) return false;
  }
  co2 = ((uint16_t)b[0] << 8) | b[1];
  temperatura = scd4xTemperaturaC(((uint16_t)b[3] << 8) | b[4]);
  humedad = scd4xHumedadPct(((uint16_t)b[6] << 8) | b[7]);
  return true;
}

static void mostrarEstado(EstadoAire estado) {
  digitalWrite(PIN_LED_VERDE, estado == AIRE_BUENO ? HIGH : LOW);
  digitalWrite(PIN_LED_AMARILLO, estado == AIRE_REGULAR ? HIGH : LOW);
  digitalWrite(PIN_LED_ROJO, estado == AIRE_MALO ? HIGH : LOW);
}

#if USAR_WIFI
static WebServer servidor(80);

static void responderDatos() {
  servidor.sendHeader("Access-Control-Allow-Origin", "*");
  if (!hayMedicion) {
    servidor.send(503, "application/json", "{\"error\":\"sin lecturas\"}");
    return;
  }
  char cuerpo[160];
  snprintf(cuerpo, sizeof(cuerpo),
           "{\"co2_ppm\":%u,\"temperatura_c\":%.1f,\"humedad_pct\":%.1f,"
           "\"estado\":\"%s\",\"tiempo_ms\":%lu}",
           ultimoCo2, ultimaTemperatura, ultimaHumedad, nombreEstado(ultimoEstado),
           ultimaMedicion);
  servidor.send(200, "application/json", cuerpo);
}

static void conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("# Conectando a Wi-Fi");
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000UL) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("# IP: ");
    Serial.println(WiFi.localIP());
    servidor.on("/datos.json", responderDatos);
    servidor.begin();
  } else {
    Serial.println("# No se pudo conectar. Sigue funcionando por serial.");
  }
}
#endif

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_AMARILLO, OUTPUT);
  pinMode(PIN_LED_ROJO, OUTPUT);

  // Prueba de LEDs al encender: se prenden de a uno.
  digitalWrite(PIN_LED_VERDE, HIGH);
  delay(300);
  digitalWrite(PIN_LED_AMARILLO, HIGH);
  delay(300);
  digitalWrite(PIN_LED_ROJO, HIGH);
  delay(300);
  mostrarEstado(AIRE_BUENO);

  Wire.begin(PIN_SDA, PIN_SCL);
  enviarComando(CMD_DETENER_MEDICION);
  delay(500);
  if (!enviarComando(CMD_INICIAR_MEDICION)) {
    Serial.println("# No se encontro el sensor SCD40. Revisa el cableado I2C.");
  }

#if USAR_WIFI
  conectarWifi();
#endif

  // Cabecera del CSV. Las lineas que empiezan con # son mensajes de estado.
  Serial.println("tiempo_ms,co2_ppm,temperatura_c,humedad_pct");
}

void loop() {
#if USAR_WIFI
  servidor.handleClient();
#endif

  unsigned long ahora = millis();
  if (ahora - ultimaConsulta < 1000UL) {
    return;
  }
  ultimaConsulta = ahora;

  // El SCD40 genera una medicion nueva cada 5 segundos.
  if (!datosListos()) {
    return;
  }

  uint16_t co2;
  float temperatura, humedad;
  if (!leerMedicion(co2, temperatura, humedad)) {
    Serial.println("# error de lectura del SCD40");
    return;
  }

  ultimoCo2 = co2;
  ultimaTemperatura = temperatura;
  ultimaHumedad = humedad;
  ultimoEstado = clasificarCo2(co2, UMBRAL_AMARILLO_PPM, UMBRAL_ROJO_PPM);
  ultimaMedicion = ahora;
  hayMedicion = true;

  mostrarEstado(ultimoEstado);
  Serial.printf("%lu,%u,%.1f,%.1f\n", ahora, co2, temperatura, humedad);
}
