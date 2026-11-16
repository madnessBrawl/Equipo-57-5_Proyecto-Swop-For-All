/*
  Archivo: PersistenciaJSON.js (BACKEND: back/Persistencia/)
  Clase: PersistenciaJSON
  Función: Clase base orientada a objetos que gestiona la persistencia física en archivos .JSON
           en el sistema de archivos del servidor, sustituyendo el almacenamiento volátil
           y centralizando las operaciones de lectura, escritura y búsqueda atómica.
*/

const fs = require('node:fs');
const path = require('node:path');

class PersistenciaJSON {
  constructor(nombreArchivo, datosSemilla = []) {
    if (!nombreArchivo || typeof nombreArchivo !== 'string') {
      throw new Error('Debe especificar un nombre de archivo .json válido.');
    }

    // Ruta absoluta hacia la carpeta back/Persistencia/
    this._directorio = __dirname;
    this._rutaArchivo = path.join(this._directorio, nombreArchivo);
    this._datosSemilla = Array.isArray(datosSemilla) ? datosSemilla : [];

    this._asegurarArchivo();
  }

  get rutaArchivo() {
    return this._rutaArchivo;
  }

  // Verifica que el archivo exista; si no, lo inicializa con los datos semilla
  _asegurarArchivo() {
    try {
      if (!fs.existsSync(this._directorio)) {
        fs.mkdirSync(this._directorio, { recursive: true });
      }

      if (!fs.existsSync(this._rutaArchivo)) {
        this._escribirArchivo(this._datosSemilla);
      }
    } catch (error) {
      console.error(`[PersistenciaJSON] Error al inicializar ${this._rutaArchivo}:`, error.message);
      throw error;
    }
  }

  // Lectura física del archivo .json
  _leerArchivo() {
    try {
      if (!fs.existsSync(this._rutaArchivo)) {
        return [];
      }
      const contenido = fs.readFileSync(this._rutaArchivo, 'utf-8');
      if (!contenido || !contenido.trim()) {
        return [];
      }
      return JSON.parse(contenido);
    } catch (error) {
      console.error(`[PersistenciaJSON] Error al leer ${this._rutaArchivo}:`, error.message);
      return [];
    }
  }

  // Escritura física atómica del archivo .json
  _escribirArchivo(datos) {
    try {
      const jsonString = JSON.stringify(datos, null, 2);
      fs.writeFileSync(this._rutaArchivo, jsonString, 'utf-8');
      return true;
    } catch (error) {
      console.error(`[PersistenciaJSON] Error al escribir ${this._rutaArchivo}:`, error.message);
      throw error;
    }
  }

  // Obtiene todos los registros persistidos
  obtenerTodos() {
    return this._leerArchivo();
  }

  // Busca un registro por su propiedad id
  buscarPorId(id) {
    if (!id) return null;
    const todos = this._leerArchivo();
    return todos.find(item => String(item.id) === String(id)) || null;
  }

  // Busca registros que coincidan con un predicado
  buscarPorPredicado(predicado) {
    if (typeof predicado !== 'function') return [];
    const todos = this._leerArchivo();
    return todos.filter(predicado);
  }

  // Guarda un nuevo registro o actualiza uno existente por id
  guardar(item) {
    if (!item || typeof item !== 'object') {
      throw new Error('El elemento a persistir debe ser un objeto.');
    }

    // Si tiene método toJSON(), lo usamos para asegurar objeto plano
    const datosGuardar = typeof item.toJSON === 'function' ? item.toJSON() : { ...item };

    if (!datosGuardar.id) {
      datosGuardar.id = `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    const todos = this._leerArchivo();
    const indice = todos.findIndex(r => String(r.id) === String(datosGuardar.id));

    if (indice >= 0) {
      todos[indice] = datosGuardar; // Actualizar
    } else {
      todos.push(datosGuardar); // Insertar
    }

    this._escribirArchivo(todos);
    return datosGuardar;
  }

  // Elimina un registro por id
  eliminar(id) {
    if (!id) return false;
    const todos = this._leerArchivo();
    const filtrados = todos.filter(r => String(r.id) !== String(id));
    if (filtrados.length === todos.length) {
      return false; // No existía
    }
    this._escribirArchivo(filtrados);
    return true;
  }

  // Cantidad total de registros
  total() {
    return this._leerArchivo().length;
  }
}

module.exports = PersistenciaJSON;
