// Caja para el monitor de CO2 del aula (ESP32 DevKit + sensor SCD40 + 3 LEDs).
// Parametrica: ajusta las medidas segun tu placa y exporta STL desde OpenSCAD.
// Ejercicio para el curso: cambiar los parametros y volver a imprimir.
//
// parte = "base" | "tapa" | "ambas"

parte = "ambas";

// Medidas internas (mm)
int_x = 82;
int_y = 58;
int_z = 24;

pared = 2.4;
piso = 2.4;
tapa_esp = 3;

// Postes de los tornillos (M3 autorroscante)
poste_d = 7;
agujero_poste = 2.6;
agujero_tapa = 3.4;

// ESP32 DevKit de 30 pines
esp_x = 55;
esp_y = 28.5;
riel_h = 3;
usb_ancho = 12;
usb_alto = 8;

// Placa del sensor SCD40 (breakout tipico). Medi la tuya y ajusta.
sensor_ancho = 18;
sensor_largo = 26;

// LEDs de 5 mm en la tapa
led_d = 5.2;
led_separacion = 14;

tol = 0.3;
$fn = 48;

ext_x = int_x + 2 * pared;
ext_y = int_y + 2 * pared;
ext_z = piso + int_z;

function postes() = [
    [pared + poste_d / 2, pared + poste_d / 2],
    [ext_x - pared - poste_d / 2, pared + poste_d / 2],
    [pared + poste_d / 2, ext_y - pared - poste_d / 2],
    [ext_x - pared - poste_d / 2, ext_y - pared - poste_d / 2]
];

module caja_redondeada(x, y, z, r) {
    hull()
        for (i = [r, x - r], j = [r, y - r])
            translate([i, j, 0]) cylinder(r = r, h = z);
}

module base() {
    difference() {
        union() {
            difference() {
                caja_redondeada(ext_x, ext_y, ext_z, 3);
                translate([pared, pared, piso]) cube([int_x, int_y, int_z + 1]);
            }
            // Postes
            for (p = postes())
                translate([p[0], p[1], piso - 0.01]) cylinder(d = poste_d, h = int_z + 0.01);
            // Rieles para la placa ESP32 (pegada al lado del USB)
            for (s = [-1, 1])
                translate([pared + 1, ext_y / 2 + s * (esp_y / 2 - 1.5) - 1, piso - 0.01])
                    cube([esp_x, 2, riel_h + 0.01]);
            // Tope del extremo opuesto de la placa
            translate([pared + 1 + esp_x + tol, ext_y / 2 - esp_y / 2, piso - 0.01])
                cube([2, esp_y, riel_h + 3]);
            // Cuna del sensor, junto a las ventilas
            for (s = [-1, 1])
                translate([ext_x - pared - sensor_largo - 2,
                           ext_y / 2 + s * (sensor_ancho / 2 + tol + 1) - 1,
                           piso - 0.01])
                    cube([sensor_largo, 2, 10]);
        }
        // Agujeros de los tornillos
        for (p = postes())
            translate([p[0], p[1], ext_z - 10]) cylinder(d = agujero_poste, h = 10.1);
        // Abertura USB en la pared del lado de la placa
        translate([-0.1, ext_y / 2 - usb_ancho / 2, piso + riel_h + 1.6 - 1])
            cube([pared + 0.2, usb_ancho, usb_alto]);
        // Ventilas frente al sensor: el aire del aula tiene que llegar al SCD40
        for (i = [-2 : 2])
            translate([ext_x - pared - 0.1, ext_y / 2 + i * 5 - 1, piso + 4])
                cube([pared + 0.2, 2, 12]);
    }
}

module tapa() {
    difference() {
        caja_redondeada(ext_x, ext_y, tapa_esp, 3);
        for (p = postes()) {
            translate([p[0], p[1], -0.1]) cylinder(d = agujero_tapa, h = tapa_esp + 0.2);
            translate([p[0], p[1], tapa_esp - 1.2]) cylinder(d1 = agujero_tapa, d2 = 6.4, h = 1.3);
        }
        // Tres LEDs en fila: verde, amarillo y rojo (de izquierda a derecha)
        for (i = [-1 : 1])
            translate([ext_x / 2 + i * led_separacion, ext_y * 0.68, -0.1])
                cylinder(d = led_d, h = tapa_esp + 0.2);
        // Texto grabado (0.6 mm)
        translate([ext_x / 2, ext_y * 0.3, tapa_esp - 0.6])
            linear_extrude(0.7)
                text("CO2", size = 8, halign = "center", valign = "center");
    }
}

if (parte == "base") base();
else if (parte == "tapa") tapa();
else {
    base();
    translate([0, ext_y + 10, 0]) tapa();
}
