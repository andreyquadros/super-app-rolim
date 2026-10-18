// Identidade e geografia do município. Para reaproveitar o app em outra
// cidade, ajuste este arquivo e as constantes de firestore.rules.

export const APP_NAME = "Super App Rolim de Moura";
export const CITY_NAME = "Rolim de Moura";
export const STATE = "RO";
export const INSTITUTION = "Prefeitura Municipal de Rolim de Moura";
export const IBGE_CODE = "1100288";

export const CITY_CENTER = { lat: -11.7271, lng: -61.7782 } as const;
export const CITY_ZOOM = 14;

/** Contatos exibidos no app (deixe vazio para ocultar). */
export const CONTACTS = {
  ouvidoriaPhone: "",
  ouvidoriaEmail: "",
  website: "",
} as const;

/**
 * Bairros sugeridos no formulário de zeladoria (o OpenStreetMap não tem os
 * bairros de Rolim de Moura). Preencha com a lista oficial do cadastro
 * imobiliário para padronizar os relatórios; vazio = campo livre.
 */
export const NEIGHBORHOODS: readonly string[] = [];

/** Mapa base (OpenStreetMap, sem custo de API). */
export const MAP_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const;

/**
 * Limite municipal oficial, IBGE (malha intermediária), em [lng, lat].
 * Fonte: https://servicodados.ibge.gov.br/api/v3/malhas/municipios/1100288?formato=application/vnd.geo+json
 */
export const CITY_BOUNDARY: ReadonlyArray<readonly [number, number]> = [
  [-61.5346, -11.7432], [-61.5373, -11.7381], [-61.5351, -11.7294], [-61.544, -11.7294], [-61.5487, -11.7202],
  [-61.5477, -11.7064], [-61.55, -11.6985], [-61.557, -11.7016], [-61.5642, -11.6942], [-61.5683, -11.6752],
  [-61.5758, -11.6694], [-61.5743, -11.6651], [-61.5592, -11.6566], [-61.5554, -11.6438], [-61.5586, -11.634],
  [-61.549, -11.6191], [-61.5552, -11.6154], [-61.5669, -11.6029], [-61.581, -11.5978], [-61.5908, -11.5973],
  [-61.5991, -11.5915], [-61.5957, -11.5812], [-61.6142, -11.5838], [-61.7954, -11.5846], [-61.9138, -11.585],
  [-61.9116, -11.5876], [-61.916, -11.6008], [-61.9269, -11.616], [-61.9409, -11.6199], [-61.9406, -11.6274],
  [-61.9516, -11.6264], [-61.9624, -11.6314], [-61.9649, -11.6434], [-61.9578, -11.6528], [-61.9594, -11.6595],
  [-61.9714, -11.6686], [-61.9789, -11.6711], [-61.9806, -11.6778], [-61.9751, -11.6877], [-61.9796, -11.711],
  [-61.9773, -11.7218], [-61.9728, -11.7293], [-61.9621, -11.7311], [-61.9588, -11.7353], [-61.9833, -11.7471],
  [-61.9892, -11.7526], [-61.9945, -11.7696], [-62.0068, -11.7814], [-62.0186, -11.7963], [-62.0203, -11.8097],
  [-62.0268, -11.82], [-62.0379, -11.8255], [-62.0376, -11.8499], [-62.0504, -11.8674], [-62.0457, -11.8684],
  [-62.0287, -11.8605], [-62.0155, -11.8586], [-62.0072, -11.8681], [-61.9914, -11.87], [-61.9782, -11.8645],
  [-61.9747, -11.8682], [-61.9652, -11.8646], [-61.9618, -11.8691], [-61.9525, -11.8643], [-61.9329, -11.8627],
  [-61.9211, -11.8669], [-61.9234, -11.8773], [-61.919, -11.8907], [-61.9005, -11.892], [-61.8994, -11.8968],
  [-61.8905, -11.9068], [-61.8887, -11.8952], [-61.8835, -11.8851], [-61.8695, -11.8849], [-61.8663, -11.8752],
  [-61.8567, -11.8753], [-61.8508, -11.869], [-61.839, -11.8684], [-61.8321, -11.857], [-61.6881, -11.8567],
  [-61.5643, -11.8564], [-61.5619, -11.8488], [-61.5537, -11.846], [-61.5509, -11.8327], [-61.5381, -11.8155],
  [-61.5397, -11.8089], [-61.5327, -11.7963], [-61.5373, -11.7905], [-61.5253, -11.7867], [-61.5288, -11.7782],
  [-61.5263, -11.7673], [-61.5214, -11.7593], [-61.53, -11.7533], [-61.5387, -11.7537], [-61.5346, -11.7432],
];
