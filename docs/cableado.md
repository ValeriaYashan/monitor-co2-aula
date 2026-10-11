# Cableado

Todo funciona a 3,3 V. El sensor SCD40 se conecta por I2C y los tres LEDs del semáforo a pines digitales con una resistencia de 220 Ω cada uno.

| Componente | Conexión en el ESP32 DevKit |
|------------|------------------------------|
| SCD40 VCC | 3V3 |
| SCD40 GND | GND |
| SCD40 SDA | GPIO 21 |
| SCD40 SCL | GPIO 22 |
| LED verde (ánodo, con resistencia) | GPIO 25 |
| LED amarillo (ánodo, con resistencia) | GPIO 26 |
| LED rojo (ánodo, con resistencia) | GPIO 27 |
| Cátodo de los tres LEDs | GND |

Los pines se cambian en `firmware/src/config.h`. Al encender, los tres LEDs se prenden de a uno como prueba y después queda activo solo el que corresponde al nivel de CO2.

## Sobre el sensor y las mediciones

El SCD40 es un sensor de CO2 fotoacústico, a diferencia de los módulos baratos tipo MQ-135, que reaccionan a varios gases y no sirven para medir CO2. El fabricante da una precisión típica del orden de ±50 ppm más el 5 % de la lectura en el rango habitual de un aula; conviene verificar la cifra en la hoja de datos vigente antes de citarla.

El sensor trae calibración automática (ASC), que asume que en algún momento de la semana el aire llega a niveles de aire exterior, alrededor de 400 ppm. Una buena práctica de curso es dejar el dispositivo una hora cerca de una ventana abierta y comparar la lectura con ese valor. La temperatura y la humedad que informa el SCD40 son secundarias: la placa se calienta y esas lecturas suelen sesgarse unos grados, así que el análisis se centra en el CO2.

## Seguridad

El circuito se alimenta por USB a 3,3 V lógicos y no presenta riesgos eléctricos de consideración. Conviene que los estudiantes arranquen siempre con el cable USB desconectado al modificar el cableado.
