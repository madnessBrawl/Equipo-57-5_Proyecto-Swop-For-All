/*
  Archivo: LibroPersistencia.js (BACKEND: back/Persistencia/)
  Clase: LibroPersistencia
  Función: Especialización de PersistenciaJSON para la entidad Libro.
           Guarda y recupera libros directamente desde el archivo back/Persistencia/libros.json.
*/

const PersistenciaJSON = require('./PersistenciaJSON');
const Libro = require('../models/Libro');

class LibroPersistencia extends PersistenciaJSON {
  constructor(archivoODatos = 'libros.json', datosIniciales = null) {
    let nombreArchivo = 'libros.json';
    let iniciales = datosIniciales;

    if (Array.isArray(archivoODatos)) {
      iniciales = archivoODatos;
      nombreArchivo = (typeof datosIniciales === 'string' && datosIniciales) ? datosIniciales : 'libros.json';
    } else if (typeof archivoODatos === 'string' && archivoODatos.trim()) {
      nombreArchivo = archivoODatos.trim();
    }

    // Semilla por defecto si no se especifican datos
    const semilla = iniciales !== null ? iniciales : [
      {
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
}

module.exports = LibroPersistencia;
