/*
  Archivo: UsuarioPersistencia.js (BACKEND: back/Persistencia/)
  Clase: UsuarioPersistencia
  Función: Gestiona la persistencia de usuarios en usuarios.json con
           protección automática de campos sensibles (clave, correo)
           mediante el paquete npm ncrypt-js (AES-256-CBC).

  SEGURIDAD (RNF-SEG-01):
    - Los campos "clave" y "correo" se guardan SIEMPRE cifrados en disco.
    - Al buscar/comparar, se descifran en memoria de forma transparente.
    - Ningún acceso directo al JSON revela datos personales.
*/

const PersistenciaJSON = require('./PersistenciaJSON');
const CifradoService   = require('../Service/CifradoService');

class UsuarioPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'usuarios.json') {
    const semilla = [];

    super(nombreArchivo, semilla);

    // Instancia del servicio de cifrado (ncrypt-js)
    this._cifrado = new CifradoService();

    // Al inicializar, cifrar los campos sensibles de la semilla si el archivo
    // se creó nuevo (los valores de semilla llegan en texto plano).
    this._cifrarSemillaEnDisco();
  }

  // ── Cifrado de semilla ────────────────────────────────────────────────────

  /*
    _cifrarSemillaEnDisco(): Si el archivo se acaba de crear con la semilla
    en texto plano, esta función encripta clave y correo de cada registro.
    Solo actúa si detecta valores sin cifrar.
  */
  _cifrarSemillaEnDisco() {
    try {
      const todos = this._leerArchivo();
      let modificado = false;
      const actualizados = todos.map(u => {
        const nuevo = { ...u };
        if (u.clave && !this._estaCifrado(u.clave)) {
          nuevo.clave   = this._cifrado.cifrar(u.clave);
          modificado = true;
        }
        if (u.correo && !this._estaCifrado(u.correo)) {
          nuevo.correo  = this._cifrado.cifrar(u.correo);
          modificado = true;
        }
        return nuevo;
      });
      if (modificado) {
        this._escribirArchivo(actualizados);
      }
    } catch (e) {
      // No bloquear el arranque si falla el cifrado inicial
      console.warn('[UsuarioPersistencia] Advertencia al cifrar semilla:', e.message);
    }
  }

  // ── Helpers de cifrado ───────────────────────────────────────────────────

  /*
    _estaCifrado(valor): Verifica si un valor ya tiene el formato cifrado
    de ncrypt-js ("<iv_hex>.<datos_hex>").
  */
  _estaCifrado(valor) {
    return this._cifrado.esCifradoValido(valor);
  }

  /*
    _cifrarCamposSensibles(usuario): Devuelve una copia del objeto usuario
    con "clave" y "correo" cifrados. Nunca modifica el original.
  */
  _cifrarCamposSensibles(usuario) {
    const copia = { ...usuario };
    if (copia.clave  && !this._estaCifrado(copia.clave))  copia.clave  = this._cifrado.cifrar(copia.clave);
    if (copia.correo && !this._estaCifrado(copia.correo)) copia.correo = this._cifrado.cifrar(copia.correo);
    return copia;
  }

  /*
    _descifrarCamposSensibles(usuario): Devuelve una copia del objeto usuario
    con "clave" y "correo" descifrados a texto plano (solo en memoria).
  */
  _descifrarCamposSensibles(usuario) {
    if (!usuario) return null;
    const copia = { ...usuario };
    try {
      if (copia.clave  && this._estaCifrado(copia.clave))  copia.clave  = this._cifrado.descifrar(copia.clave);
      if (copia.correo && this._estaCifrado(copia.correo)) copia.correo = this._cifrado.descifrar(copia.correo);
    } catch (e) {
      console.warn('[UsuarioPersistencia] Error al descifrar campos:', e.message);
    }
    return copia;
  }

  // ── Sobrescritura de guardar ─────────────────────────────────────────────

  /*
    guardar(usuario): Sobrescribe el método base para garantizar que
    clave y correo SIEMPRE se persistan cifrados.
  */
  guardar(usuario) {
    const usuarioCifrado = this._cifrarCamposSensibles(usuario);
    return super.guardar(usuarioCifrado);
  }

  // ── Búsquedas (retornan datos con campos descifrados en memoria) ──────────

  /*
    buscarPorUsuario(nombreUsuario): Busca por nombre de usuario.
    Retorna el objeto con clave y correo DESCIFRADOS (solo en RAM).
    Nunca expone los valores cifrados al código que llama.
  */
  buscarPorUsuario(nombreUsuario) {
    if (!nombreUsuario) return null;
    const u = String(nombreUsuario).trim().toLowerCase();
    const todos = this._leerArchivo();
    const encontrado = todos.find(user => user.usuario && user.usuario.toLowerCase() === u) || null;
    return this._descifrarCamposSensibles(encontrado);
  }

  /*
    buscarPorCorreo(correo): Busca por correo electrónico.
    Compara descifrado vs descifrado (ambos en texto plano en RAM).
  */
  buscarPorCorreo(correoTextoPlano) {
    if (!correoTextoPlano) return null;
    const c = String(correoTextoPlano).trim().toLowerCase();
    const todos = this._leerArchivo();

    const encontrado = todos.find(user => {
      if (!user.correo) return false;
      // Descifrar el correo del JSON para comparar con el recibido en texto plano
      const correoDescifrado = this._estaCifrado(user.correo)
        ? String(this._cifrado.descifrar(user.correo)).toLowerCase()
        : user.correo.toLowerCase();
      return correoDescifrado === c;
    }) || null;

    return this._descifrarCamposSensibles(encontrado);
  }

  /*
    verificarCredenciales(nombreUsuario, claveTextoPlano): Valida login
    comparando contra el hash cifrado en disco. Devuelve el usuario sin
    clave si las credenciales son correctas, null si no.
  */
  verificarCredenciales(nombreUsuario, claveTextoPlano) {
    const usuario = this.buscarPorUsuario(nombreUsuario);
    if (!usuario) return null;
    // En este punto usuario.clave ya fue descifrado por buscarPorUsuario
    if (usuario.clave !== String(claveTextoPlano)) return null;
    const { clave, ...perfilSeguro } = usuario;
    return perfilSeguro;
  }
}

module.exports = UsuarioPersistencia;
