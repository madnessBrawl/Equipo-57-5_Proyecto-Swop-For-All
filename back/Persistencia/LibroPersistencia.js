/*
  Archivo: LibroPersistencia.js (BACKEND: back/Persistencia/)
  Clase: LibroPersistencia
  Función: Especialización de PersistenciaJSON para la entidad Libro.
           Guarda y recupera libros directamente desde el archivo back/Persistencia/libros.json.
           Integra validación de instancias Libro y cifrado ncrypt-js para seguridad.
*/

const PersistenciaJSON = require('./PersistenciaJSON');
const Libro = require('../models/Libro');
const CifradoService = require('../Service/CifradoService');

class LibroPersistencia extends PersistenciaJSON {
  constructor(datosIniciales = null, cifradoService = new CifradoService(), nombreArchivo = 'libros.json') {
    const semilla = Array.isArray(datosIniciales) ? datosIniciales : [];

    // Llama al constructor de PersistenciaJSON con nombre de archivo y semilla
    super(nombreArchivo, semilla);

    // Servicio de cifrado con ncrypt-js inyectado para seguridad de datos (RNF Confidencialidad)
    this._cifradoService = cifradoService;

    // Si se pasó un array vacío explícitamente, limpiar el archivo de cualquier contenido previo
    if (Array.isArray(datosIniciales) && datosIniciales.length === 0) {
      this._escribirArchivo([]);
    }
  }

  // Getter del servicio de cifrado
  get cifradoService() {
    return this._cifradoService;
  }

  // Sobrescribe guardar para validar la instancia de Libro antes de persistir
  guardar(libro) {
    if (!libro) {
      throw new Error('Debe proporcionar un libro para persistir.');
    }

    const instancia = libro instanceof Libro ? libro : new Libro(libro);
    const errorValidacion = instancia.validar();
    if (errorValidacion) {
      throw new Error(`Validación de persistencia fallida: ${errorValidacion}`);
    }

    const datosGuardados = super.guardar(instancia.toJSON());
    return new Libro(datosGuardados);
  }

  guardarVarios(libros) {
    if (!Array.isArray(libros)) {
      throw new Error('Debe proporcionar una lista válida de libros.');
    }

    const instancias = libros.map(libro => {
      const instancia = libro instanceof Libro ? libro : new Libro(libro);
      const errorValidacion = instancia.validar();
      if (errorValidacion) {
        throw new Error(`Validación de persistencia fallida: ${errorValidacion}`);
      }
      return instancia;
    });

    const actuales = super.obtenerTodos();
    const porId = new Map(actuales.map((libro, indice) => [String(libro.id), indice]));
    for (const instancia of instancias) {
      const datos = instancia.toJSON();
      const indice = porId.get(String(datos.id));
      if (indice === undefined) {
        porId.set(String(datos.id), actuales.length);
        actuales.push(datos);
      } else {
        actuales[indice] = datos;
      }
    }
    this._escribirArchivo(actuales);
    return instancias;
  }

  // Busca por id y retorna una instancia de Libro
  buscarPorId(id) {
    const datos = super.buscarPorId(id);
    return datos ? new Libro(datos) : null;
  }

  // Busca todos los libros y los retorna como instancias de Libro
  buscarTodos() {
    return super.obtenerTodos().map(datos => new Libro(datos));
  }

  // Busca libros que coincidan con un predicado personalizado
  buscarPorPredicado(predicado) {
    return this.buscarTodos().filter(predicado);
  }

  // Elimina un libro por ID
  eliminar(id) {
    return super.eliminar(id);
  }

  // Cantidad de registros en la persistencia
  total() {
    return super.total();
  }

  /*
    Exporta todo el catálogo serializado y cifrado con ncrypt-js.
    Garantiza el requisito no funcional de Confidencialidad y Protección ante fallos.
  */
  exportarCifrado() {
    const listadoDTO = this.buscarTodos().map(libro => libro.toJSON());
    return this._cifradoService.cifrar(listadoDTO);
  }

  /*
    Restaura el catálogo a partir de un respaldo cifrado con ncrypt-js.
  */
  importarCifrado(cadenaCifrada) {
    if (!cadenaCifrada) {
      throw new Error('Debe proporcionar un respaldo cifrado para importar.');
    }
    const librosRecuperados = this._cifradoService.descifrar(cadenaCifrada);
    if (!Array.isArray(librosRecuperados)) {
      throw new Error('El contenido descifrado no corresponde a un catálogo válido.');
    }

    for (const item of librosRecuperados) {
      this.guardar(new Libro(item));
    }
    return this.total();
  }
}

module.exports = LibroPersistencia;
