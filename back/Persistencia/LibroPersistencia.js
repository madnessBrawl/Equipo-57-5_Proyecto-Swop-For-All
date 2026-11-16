/*
  Archivo: LibroPersistencia.js (BACKEND: back/Persistencia/)
  Clase: LibroPersistencia
  Función: Especialización de PersistenciaJSON para la entidad Libro.
           Guarda y recupera libros directamente desde el archivo back/Persistencia/libros.json.
*/

const PersistenciaJSON = require('./PersistenciaJSON');
const Libro = require('../models/Libro');
const CifradoService = require('../Service/CifradoService');

class LibroPersistencia {
  constructor(datosIniciales = null, cifradoService = new CifradoService()) {
    // Almacenamiento en Map indexado por ID para acceso O(1)
    this._coleccion = new Map();
    // Servicio de cifrado con ncrypt-js inyectado para seguridad de datos
    this._cifradoService = cifradoService;

    if (datosIniciales === null) {
      this._sembrarDatosIniciales();
    } else if (Array.isArray(datosIniciales)) {
      for (const item of datosIniciales) {
        this.guardar(item instanceof Libro ? item : new Libro(item));
      }
    }

  // Getter del servicio de cifrado
  get cifradoService() {
    return this._cifradoService;
  }

  // Siembra libros iniciales de prueba alineados con el prototipo del sistema
  _sembrarDatosIniciales() {
    const demo = [
      new Libro({
        id: 'lib_100',
        titulo: 'El Principito',
        autores: ['Antoine de Saint-Exupéry'],
        descripcion: 'Un clásico de la literatura infantil y universal sobre la amistad y el sentido de la vida.',
        portadaUrl: 'https://books.google.com/books/content?id=ylT6DwAAQBAJ&printsec=frontcover&img=1&zoom=1',
        isbn: '9780156013987',
        categorias: ['Ficción', 'Infantil'],
        disponible: true,
        propietario: null,
        fechaRegistro: '2026-11-10T00:00:00.000Z'
      },
      {
        id: 'lib_101',
        titulo: '1984',
        autores: ['George Orwell'],
        descripcion: 'Novela distópica de crítica social y política.',
        portadaUrl: 'https://books.google.com/books/content?id=cotPYEqe-rkC&printsec=frontcover&img=1&zoom=1',
        isbn: '9780451524935',
        categorias: ['Distopía', 'Ciencia Ficción'],
        disponible: true,
        propietario: null,
        fechaRegistro: '2026-11-10T00:00:00.000Z'
      },
      {
        id: 'lib_102',
        titulo: 'Doña Bárbara',
        autores: ['Rómulo Gallegos'],
        descripcion: 'Obra cumbre de la literatura venezolana sobre la lucha entre civilización y barbarie.',
        portadaUrl: '',
        isbn: '9788437603681',
        categorias: ['Literatura Venezolana', 'Clásicos'],
        disponible: true,
        propietario: null,
        fechaRegistro: '2026-11-10T00:00:00.000Z'
      },
      {
        id: 'lib_103',
        titulo: 'Cien Años de Soledad',
        autores: ['Gabriel García Márquez'],
        descripcion: 'La obra maestra del realismo mágico latinoamericano en el pueblo mítico de Macondo.',
        portadaUrl: '',
        isbn: '9780307474728',
        categorias: ['Realismo Mágico', 'Novela'],
        disponible: true,
        propietario: null,
        fechaRegistro: '2026-11-10T00:00:00.000Z'
      }
    ];

    super(nombreArchivo, semilla);
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

  // Busca por id y retorna una instancia de Libro
  buscarPorId(id) {
    const datos = super.buscarPorId(id);
    return datos ? new Libro(datos) : null;
  }

  // Busca todos y los retorna como instancias de Libro
  buscarTodos() {
    return super.obtenerTodos().map(datos => new Libro(datos));
  }

  // Busca por predicado y retorna instancias de Libro
  buscarPorPredicado(predicado) {
    return this.buscarTodos().filter(predicado);
  }

  // Elimina un libro por ID
  eliminar(id) {
    return this._coleccion.delete(String(id));
  }

  // Cantidad de registros en la persistencia
  total() {
    return this._coleccion.size;
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

    this._coleccion.clear();
    for (const item of librosRecuperados) {
      this.guardar(new Libro(item));
    }
    return this.total();
  }
}

module.exports = LibroPersistencia;
