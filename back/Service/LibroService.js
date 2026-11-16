/*
  Archivo: LibroService.js (BACKEND: back/Service/)
  Clase: LibroService
  Función: Capa de servicio de negocio para Libros.
           Implementa el paso de "Verificaciones(Libro)" y coordinación con el Repositorio
           tal como describe el diagrama de secuencia UML.
*/

const LibroRepository = require('../Repositorio/LibroRepository');
const Libro = require('../models/Libro');

class LibroService {
  constructor(libroRepository = new LibroRepository()) {
    this._libroRepository = libroRepository;
  }

  get libroRepository() {
    return this._libroRepository;
  }

  /*
    Paso del diagrama: Models -> Service: Verificaciones(Libro) -> Repositorio: TodoOK -> guardar()
  */
  verificacionesYAñadir(libroInstancia, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para añadir libros a su inventario.');
    }

    if (!libroInstancia || !(libroInstancia instanceof Libro)) {
      throw new Error('La entidad debe ser una instancia válida de la clase Libro.');
    }

    // Verificaciones de integridad y reglas de negocio
    const errorValidacion = libroInstancia.validar();
    if (errorValidacion) {
      throw new Error(`Verificación fallida: ${errorValidacion}`);
    }

    // Asignación estricta de propiedad
    libroInstancia.propietario = usuarioSesion;

    // Service -> Repositorio: TodoOK -> Persistencia (JSON).guardar()
    const libroGuardado = this._libroRepository.registrarLibro(libroInstancia);

    return {
      exito: true,
      mensaje: 'Libro añadido exitosamente',
      libro: libroGuardado
    };
  }

  /*
    Consulta de catálogo y filtrado
  */
  obtenerCatalogo(filtro = '') {
    return this._libroRepository.buscarEnCatalogo(filtro);
  }

  /*
    Inventario por usuario
  */
  obtenerInventario(usuario) {
    return this._libroRepository.obtenerLibrosPorUsuario(usuario);
  }

  /*
    Consulta externa a Google Books
  */
  async buscarEnGoogleBooks(termino) {
    return await this._libroRepository.sugerirDesdeGoogle(termino);
  }
}

module.exports = LibroService;
