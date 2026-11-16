/*
  Script: encriptar-usuarios.js (back/scripts/)
  Función: Migración única — encripta los campos "clave" y "correo"
           de todos los usuarios en usuarios.json usando ncrypt-js (AES-256-CBC).
  Uso: node back/scripts/encriptar-usuarios.js
*/

const path = require('path');
const fs   = require('fs');
const { ncrypt } = require('ncrypt-js');

const CLAVE_SECRETA = process.env.CLAVE_CIFRADO || 'swop-for-all-secret-key-2026';
const cifrador = new ncrypt(CLAVE_SECRETA);

const RUTA_JSON = path.join(__dirname, '..', 'Persistencia', 'usuarios.json');
const RUTA_BACKUP = RUTA_JSON + '.backup_' + Date.now();

// ── Helpers ────────────────────────────────────────────────────────────────
function yaCifrado(valor) {
  // ncrypt-js produce cadenas con formato "<hex>.<hex>" — sin espacios ni @
  if (typeof valor !== 'string') return false;
  const partes = valor.split('.');
  return partes.length === 2 && /^[0-9a-f]+$/i.test(partes[0]) && /^[0-9a-f]+$/i.test(partes[1]);
}

// ── Main ───────────────────────────────────────────────────────────────────
const usuarios = JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'));

// Respaldar el JSON original antes de modificarlo
fs.writeFileSync(RUTA_BACKUP, JSON.stringify(usuarios, null, 2), 'utf8');
console.log(`✅ Backup guardado en: ${RUTA_BACKUP}`);

let modificados = 0;
const actualizados = usuarios.map(u => {
  const nuevo = { ...u };
  let cambio = false;

  if (u.clave && !yaCifrado(u.clave)) {
    nuevo.clave = cifrador.encrypt(u.clave);
    cambio = true;
  }
  if (u.correo && !yaCifrado(u.correo)) {
    nuevo.correo = cifrador.encrypt(u.correo);
    cambio = true;
  }

  if (cambio) modificados++;
  return nuevo;
});

fs.writeFileSync(RUTA_JSON, JSON.stringify(actualizados, null, 2), 'utf8');
console.log(`🔐 Encriptados ${modificados} usuarios. usuarios.json actualizado.`);
console.log('   Campos protegidos: clave, correo (AES-256-CBC via ncrypt-js)');
