/*
  Archivo: CalificacionPersistencia.js (BACKEND: back/Persistencia/)
  Clase: CalificacionPersistencia
  Función: Gestiona la persistencia de calificaciones y reseñas en back/Persistencia/calificaciones.json.
*/

const PersistenciaJSON = require('./PersistenciaJSON');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SALT = Buffer.from('swop-for-all-calificaciones-v1');
const ARCHIVO_CLAVE = path.join(__dirname, '.swop-reputacion-key');

class CalificacionPersistencia extends PersistenciaJSON {
  constructor(nombreArchivo = 'calificaciones.json') {
    super(nombreArchivo, []);
    this._claveCifrado = this._obtenerClaveCifrado();

    const registros = super.obtenerTodos();
    if (registros.length > 0) {
      if (!this._claveCifrado) {
        throw new Error('No fue posible inicializar el cifrado de reputación.');
      }

      const migrados = registros.map(registro =>
        registro.cifrado ? registro : this._cifrar(registro)
      );
      if (migrados.some((registro, indice) => registro !== registros[indice])) {
        super._escribirArchivo(migrados);
      }
    }
  }

  obtenerTodos() {
    return super.obtenerTodos().map(registro => this._descifrar(registro));
  }

  buscarPorId(id) {
    if (!id) return null;
    return this.obtenerTodos().find(registro => String(registro.id) === String(id)) || null;
  }

  buscarPorPredicado(predicado) {
    if (typeof predicado !== 'function') return [];
    return this.obtenerTodos().filter(predicado);
  }

  guardar(item) {
    if (!item || typeof item !== 'object') {
      throw new Error('El elemento a persistir debe ser un objeto.');
    }
    if (!this._claveCifrado) {
      throw new Error('Configure SWOP_REPUTACION_KEY antes de guardar calificaciones.');
    }

    const datos = typeof item.toJSON === 'function' ? item.toJSON() : { ...item };
    if (!datos.id) {
      datos.id = `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }
    super.guardar(this._cifrar(datos));
    return datos;
  }

  buscarPorEvaluado(usuario) {
    if (!usuario) return [];
    const u = String(usuario).trim().toLowerCase();
    return this.buscarPorPredicado(c => c.evaluado && c.evaluado.toLowerCase() === u);
  }

  buscarPorEvaluador(usuario) {
    if (!usuario) return [];
    const u = String(usuario).trim().toLowerCase();
    return this.buscarPorPredicado(c => c.evaluador && c.evaluador.toLowerCase() === u);
  }

  _obtenerClaveCifrado() {
    const secreto = process.env.SWOP_REPUTACION_KEY || this._obtenerSecretoPersistido();
    if (secreto.length < 32) {
      throw new Error('La clave de cifrado de reputación configurada no es válida.');
    }
    return crypto.scryptSync(secreto, SALT, 32);
  }

  _obtenerSecretoPersistido() {
    try {
      return fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error('No fue posible acceder a la clave local de reputación.');
      }
    }

    const secreto = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(ARCHIVO_CLAVE, secreto, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      return secreto;
    } catch (error) {
      if (error.code === 'EEXIST') {
        return fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim();
      }
      throw new Error('No fue posible guardar la clave local de reputación.');
    }
  }

  _cifrar(registro) {
    if (!this._claveCifrado) {
      throw new Error('No fue posible cifrar la calificación.');
    }
    const { id, ...datosSensibles } = registro;
    const iv = crypto.randomBytes(12);
    const cifrador = crypto.createCipheriv('aes-256-gcm', this._claveCifrado, iv);
    const contenido = Buffer.concat([
      cifrador.update(JSON.stringify(datosSensibles), 'utf8'),
      cifrador.final()
    ]);

    return {
      id,
      cifrado: {
        iv: iv.toString('base64'),
        etiqueta: cifrador.getAuthTag().toString('base64'),
        contenido: contenido.toString('base64')
      }
    };
  }

  _descifrar(registro) {
    if (!registro.cifrado) return registro;
    if (!this._claveCifrado) {
      throw new Error('No fue posible descifrar las calificaciones.');
    }

    const descifrador = crypto.createDecipheriv(
      'aes-256-gcm',
      this._claveCifrado,
      Buffer.from(registro.cifrado.iv, 'base64')
    );
    descifrador.setAuthTag(Buffer.from(registro.cifrado.etiqueta, 'base64'));
    const contenido = Buffer.concat([
      descifrador.update(Buffer.from(registro.cifrado.contenido, 'base64')),
      descifrador.final()
    ]).toString('utf8');

    return { id: registro.id, ...JSON.parse(contenido) };
  }
}

module.exports = CalificacionPersistencia;
