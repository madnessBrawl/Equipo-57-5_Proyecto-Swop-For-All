const fs = require('fs');
const ruta = 'c:/Users/52GM/Documents/IDS/Equipo-57-5_Proyecto-Swop-For-All/back/server.js';
const contenido = fs.readFileSync(ruta, 'utf8');
const lineas = contenido.split('\n');

// Líneas 130-135 (índice 129-134) son el bloque a reemplazar
// 130: "      const encontrado = usuarioPersistencia.buscarPorUsuario(body.usuario);\r"
// 131: "      if (!encontrado || encontrado.clave !== body.clave) {\r"
// 132: "        return responderJSON(res, 401, { error: 'Credenciales invÃ¡lidas.' });\r"
// 133: "      }\r"
// 134: "      const { clave, ...sesion } = encontrado;\r"
// 135: "      return responderJSON(res, 200, { mensaje: 'Inicio de sesiÃ³n exitoso', usuario: sesion });\r"

// Verificar que son las líneas correctas
console.log('Líneas a reemplazar:');
for (let i = 129; i <= 135; i++) {
  console.log(i+1, JSON.stringify(lineas[i]));
}

// Reemplazar las líneas 130-135 con el nuevo código
const nuevasLineas = [
  "      // verificarCredenciales() descifra clave/correo con ncrypt-js (AES-256-CBC)\r",
  "      const perfilSeguro = usuarioPersistencia.verificarCredenciales(body.usuario, body.clave);\r",
  "      if (!perfilSeguro) {\r",
  "        return responderJSON(res, 401, { error: 'Credenciales inv\u00e1lidas.' });\r",
  "      }\r",
  "      return responderJSON(res, 200, { mensaje: 'Inicio de sesi\u00f3n exitoso', usuario: perfilSeguro });\r"
];

lineas.splice(129, 6, ...nuevasLineas);

fs.writeFileSync(ruta, lineas.join('\n'), 'utf8');
console.log('\nOK: server.js actualizado.');
