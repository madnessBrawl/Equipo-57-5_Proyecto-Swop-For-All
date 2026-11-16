/*
  Archivo: LibroPersistencia.js (BACKEND: back/Persistencia/)
  Clase: LibroPersistencia
  Función: Capa de persistencia para el almacenamiento y recuperación de objetos Libro.
           Sigue la teoría de Diseño 3 (arquitectura en capas) desacoplando el mecanismo
           de almacenamiento del resto de la aplicación.
*/

const Libro = require('../models/Libro');

class LibroPersistencia {
  constructor(datosIniciales = []) {
    // Almacenamiento en Map indexado por ID para acceso O(1)
    this._coleccion = new Map();

    if (Array.isArray(datosIniciales) && datosIniciales.length > 0) {
      for (const item of datosIniciales) {
        this.guardar(item instanceof Libro ? item : new Libro(item));
      }
    } else {
      this._sembrarDatosIniciales();
    }
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
        propietario: 'carlos_lector'
      }),
      new Libro({
        id: 'lib_101',
        titulo: '1984',
        autores: ['George Orwell'],
        descripcion: 'Novela distópica de crítica social y política.',
        portadaUrl: 'https://books.google.com/books/content?id=cotPYEqe-rkC&printsec=frontcover&img=1&zoom=1',
        isbn: '9780451524935',
        categorias: ['Distopía', 'Ciencia Ficción'],
        disponible: true,
        propietario: 'maria_books'
      }),
      new Libro({
        id: 'lib_102',
        titulo: 'Doña Bárbara',
        autores: ['Rómulo Gallegos'],
        descripcion: 'Obra cumbre de la literatura venezolana sobre la lucha entre civilización y barbarie.',
        portadaUrl: '',
        isbn: '9788437603681',
        categorias: ['Literatura Venezolana', 'Clásicos'],
        disponible: true,
        propietario: 'ana_lectora'
      }),
      new Libro({
        id: 'lib_103',
        titulo: 'Cien Años de Soledad',
        autores: ['Gabriel García Márquez'],
        descripcion: 'La obra maestra del realismo mágico latinoamericano en el pueblo mítico de Macondo.',
        portadaUrl: '',
        isbn: '9780307474728',
        categorias: ['Realismo Mágico', 'Novela'],
        disponible: true,
        propietario: 'pedro_lector'
      })
    ];

    for (const libro of demo) {
      this.guardar(libro);
    }
  }

  // Guarda una instancia de Libro en la colección
  guardar(libro) {
    if (!libro || !(libro instanceof Libro)) {
      throw new Error('Solo se pueden persistir instancias de la clase Libro.');
    }
    const errorValidacion = libro.validar();
    if (errorValidacion) {
      throw new Error(`Validación de persistencia fallida: ${errorValidacion}`);
    }

    this._coleccion.set(libro.id, libro);
    return libro;
  }

  // Busca un libro por su ID único
  buscarPorId(id) {
    if (!id) return null;
    return this._coleccion.get(String(id)) || null;
  }

  // Retorna todos los libros registrados
  buscarTodos() {
    return Array.from(this._coleccion.values());
  }

  // Busca libros que cumplan con una función predicado
  buscarPorPredicado(predicado) {
    if (typeof predicado !== 'function') return [];
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
}

module.exports = LibroPersistencia;
