// Script: fix-server-endpoints.js
// Corrige en server.js:
//   1. GET /api/usuarios  -> descifra correo antes de enviar al cliente
//   2. POST /api/usuarios/registro -> retorna perfil con correo descifrado

const fs   = require('fs');
const path = require('path');
const { ncrypt } = require('ncrypt-js');

const CLAVE = process.env.CLAVE_CIFRADO || 'swop-for-all-secret-key-2026';
const cifrador = new ncrypt(CLAVE);

function esCifrado(v) {
  if (typeof v !== 'string') return false;
  const p = v.split('.');
  return p.length === 2 && /^[0-9a-f]+$/i.test(p[0]) && /^[0-9a-f]+$/i.test(p[1]);
}

const ruta = path.join(__dirname, '..', 'server.js');
const lineas = fs.readFileSync(ruta, 'utf8').split('\n');

// ── Parche 1: GET /api/usuarios — ocultar clave Y descifrar correo ─────────
// Línea actual (~106): const { clave, ...publico } = u; // No exponer la clave
const idxGetUsuarios = lineas.findIndex(l =>
  l.includes("const { clave, ...publico } = u;") && l.includes("No exponer la clave")
);
if (idxGetUsuarios !== -1) {
  lineas[idxGetUsuarios] =
    "        const { clave, correo, ...resto } = u;\n" +
    "        // Descifrar correo con ncrypt-js para retornar valor legible sin exponer la clave\n" +
    "        const correoLegible = correo && correo.includes('.') ? (() => { try { return cifradoService.descifrar(correo); } catch { return correo; } })() : correo;\n" +
    "        const publico = { ...resto, correo: correoLegible };";
  console.log('✅ Parche 1 aplicado: GET /api/usuarios descifra correo');
} else {
  console.log('⚠️  Parche 1: línea no encontrada (ya parchado o cambió)');
}

// ── Parche 2: POST /api/usuarios/registro — retorno descifrado ───────────
// Línea actual (~123): const { clave, ...perfilSeguro } = nuevo;
const idxRegistro = lineas.findIndex(l =>
  l.includes("const { clave, ...perfilSeguro } = nuevo;")
);
if (idxRegistro !== -1) {
  lineas[idxRegistro] =
    "      const { clave: _c, correo: correoCifrado, ...resto } = nuevo;\n" +
    "      // Descifrar correo para la respuesta al cliente (nunca se devuelve la clave)\n" +
    "      const correoRespuesta = correoCifrado && correoCifrado.includes('.') ? (() => { try { return cifradoService.descifrar(correoCifrado); } catch { return correoCifrado; } })() : correoCifrado;\n" +
    "      const perfilSeguro = { ...resto, correo: correoRespuesta };";
  console.log('✅ Parche 2 aplicado: POST /api/usuarios/registro descifra correo en respuesta');
} else {
  console.log('⚠️  Parche 2: línea no encontrada (ya parchado o cambió)');
}

fs.writeFileSync(ruta, lineas.join('\n'), 'utf8');
console.log('Archivo server.js guardado.');
