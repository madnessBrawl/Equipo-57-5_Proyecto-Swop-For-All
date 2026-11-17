/*
  Archivo: PerfilPersistencia.js (BACKEND: back/Persistencia/)
  Clase: PerfilPersistencia
  Función: Capa de persistencia en archivos JSON para perfiles de lectores.
           Protege automáticamente los campos sensibles (clave, correo) con
           cifrado AES-256-CBC mediante el paquete npm ncrypt-js.

  SEGURIDAD (RNF-SEG-01):
    - clave y correo se guardan SIEMPRE cifrados en disco.
    - Las búsquedas descifran en memoria de forma transparente.
*/

const PersistenciaJSON = require('./PersistenciaJSON');
const CifradoService   = require('../Service/CifradoService');

class PerfilPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'usuarios.json') {
    const semilla = [];

    super(nombreArchivo, semilla);

    // Instancia del servicio de cifrado (ncrypt-js)
    this._cifrado = new CifradoService();

    // Cifrar semilla si el archivo se creó nuevo con texto plano
    this._cifrarSemillaEnDisco();
  }

  // ── Helpers de cifrado ───────────────────────────────────────────────────

  _estaCifrado(valor) {
    return this._cifrado.esCifradoValido(valor);
  }

  _cifrarCamposSensibles(perfil) {
    const copia = { ...perfil };
    if (copia.clave  && !this._estaCifrado(copia.clave))  copia.clave  = this._cifrado.cifrar(copia.clave);
    if (copia.correo && !this._estaCifrado(copia.correo)) copia.correo = this._cifrado.cifrar(copia.correo);
    return copia;
  }

  _descifrarCamposSensibles(perfil) {
    if (!perfil) return null;
    const copia = { ...perfil };
    try {
      if (copia.clave  && this._estaCifrado(copia.clave))  copia.clave  = this._cifrado.descifrar(copia.clave);
      if (copia.correo && this._estaCifrado(copia.correo)) copia.correo = this._cifrado.descifrar(copia.correo);
    } catch (e) {
      console.warn('[PerfilPersistencia] Error al descifrar campos:', e.message);
    }
    return copia;
  }

  _cifrarSemillaEnDisco() {
    try {
      const todos = this._leerArchivo();
      let modificado = false;
      const actualizados = todos.map(p => {
        const nuevo = { ...p };
        if (p.clave  && !this._estaCifrado(p.clave))  { nuevo.clave  = this._cifrado.cifrar(p.clave);  modificado = true; }
        if (p.correo && !this._estaCifrado(p.correo)) { nuevo.correo = this._cifrado.cifrar(p.correo); modificado = true; }
        return nuevo;
      });
      if (modificado) this._escribirArchivo(actualizados);
    } catch (e) {
      console.warn('[PerfilPersistencia] Advertencia al cifrar semilla:', e.message);
    }
  }

  // ── Sobrescritura de guardar ─────────────────────────────────────────────

  guardar(perfil) {
    const perfilCifrado = this._cifrarCamposSensibles(perfil);
    return super.guardar(perfilCifrado);
  }

  actualizarPorUsuario(nombreUsuario, datosNuevos) {
    if (!nombreUsuario) return null;
    const u = String(nombreUsuario).trim().toLowerCase();
    const todos = this._leerArchivo();
    const indice = todos.findIndex(item => item.usuario && item.usuario.toLowerCase() === u);
    if (indice === -1) return null;

    // Cifrar campos sensibles antes de actualizar
    const datosCifrados = this._cifrarCamposSensibles(datosNuevos);

    todos[indice] = {
      ...todos[indice],
      ...datosCifrados,
      usuario: todos[indice].usuario   // el usuario no cambia
    };

    this._escribirArchivo(todos);
    // Retornar con campos descifrados para uso interno
    return this._descifrarCamposSensibles(todos[indice]);
  }

  // ── Búsquedas (retornan datos con campos descifrados en memoria) ──────────

  buscarPorUsuario(nombreUsuario) {
    if (!nombreUsuario) return null;
    const u = String(nombreUsuario).trim().toLowerCase();
    const todos = this._leerArchivo();
    const encontrado = todos.find(item => item.usuario && item.usuario.toLowerCase() === u) || null;
    return this._descifrarCamposSensibles(encontrado);
  }

  buscarPorCorreo(correoTextoPlano) {
    if (!correoTextoPlano) return null;
    const c = String(correoTextoPlano).trim().toLowerCase();
    const todos = this._leerArchivo();
    const encontrado = todos.find(item => {
      if (!item.correo) return false;
      const correoDesc = this._estaCifrado(item.correo)
        ? String(this._cifrado.descifrar(item.correo)).toLowerCase()
        : item.correo.toLowerCase();
      return correoDesc === c;
    }) || null;
    return this._descifrarCamposSensibles(encontrado);
  }

  buscarPorTelefono(telefono) {
    if (!telefono) return null;
    const telLimpio = String(telefono).replace(/[\s-]/g, '');
    const todos = this._leerArchivo();
    const encontrado = todos.find(item =>
      item.telefono && item.telefono.replace(/[\s-]/g, '') === telLimpio
    ) || null;
    return this._descifrarCamposSensibles(encontrado);
  }
}

module.exports = PerfilPersistencia;
