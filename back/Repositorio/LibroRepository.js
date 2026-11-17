/*
  Archivo: LibroRepository.js (BACKEND: back/Repositorio/)
  Clase: LibroRepository
  Función: Repositorio de dominio para la entidad Libro.
           Aplica el patrón Repository desacoplando la lógica de negocio de la fuente de datos
           (persistencia local y servicio externo Google Books).
*/

const Libro = require('../models/Libro');
const LibroPersistencia = require('../Persistencia/LibroPersistencia');

class LibroRepository {
  constructor({ persistencia = new LibroPersistencia(), googleBooksService = null } = {}) {
    this._persistencia = persistencia;
    this._googleBooksService = googleBooksService;
  }

  // Getters para acceder a las dependencias inyectadas
  get persistencia() { return this._persistencia; }
  get googleBooksService() { return this._googleBooksService; }

  /*
    Retorna el catálogo global de libros disponibles para intercambio en la comunidad.
    Excluye libros que ya están en intercambio o no disponibles.
  */
  obtenerCatalogoGlobal() {
    return this._persistencia
      .buscarPorPredicado(libro => libro.disponible === true)
      .map(libro => libro.toJSON());
  }

  /*
    Retorna todos los libros del inventario de un usuario específico.
  */
  obtenerLibrosPorUsuario(usuario) {
    if (!usuario) return [];
    const usuarioLimpio = String(usuario).trim().toLowerCase();
    return this._persistencia
      .buscarPorPredicado(libro => libro.propietario && libro.propietario.toLowerCase() === usuarioLimpio)
      .map(libro => libro.toJSON());
  }

  /*
    Busca libros dentro del catálogo del sistema por título, autor o categoría.
  */
  buscarEnCatalogo(termino) {
    if (!termino || !termino.trim()) {
      return this.obtenerCatalogoGlobal();
    }
    const t = termino.toLowerCase().trim();
    return this._persistencia
      .buscarPorPredicado(libro =>
        libro.disponible && (
          libro.titulo.toLowerCase().includes(t) ||
          libro.autores.some(a => a.toLowerCase().includes(t)) ||
          libro.categorias.some(c => c.toLowerCase().includes(t))
        )
      )
      .map(libro => libro.toJSON());
  }

  /*
    Busca un libro por su ID único.
  */
  obtenerPorId(id) {
    const libro = this._persistencia.buscarPorId(id);
    return libro ? libro.toJSON() : null;
  }

  /*
    Registra un nuevo libro en el inventario del usuario.
  */
  registrarLibro(libro) {
    if (!libro) {
      throw new Error('Debe proporcionar los datos del libro a registrar.');
    }

    const instancia = libro instanceof Libro ? libro : new Libro(libro);
    const error = instancia.validar();
    if (error) {
      throw new Error(error);
    }

    const guardado = this._persistencia.guardar(instancia);
    return guardado.toJSON();
  }

  /*
    Actualiza la disponibilidad de un libro (p. ej. cuando pasa a intercambio activo).
  */
  actualizarDisponibilidad(idLibro, disponible) {
    const libro = this._persistencia.buscarPorId(idLibro);
    if (!libro) {
      throw new Error(`El libro con ID ${idLibro} no existe.`);
    }
    libro.marcarDisponible(disponible);
    const guardado = this._persistencia.guardar(libro);
    return guardado.toJSON ? guardado.toJSON() : guardado;
  }

  transferirLibros(oferta) {
    const movimientos = [
      ...(oferta.librosOfrecidos || []).map(libro => ({
        libro,
        propietarioActual: oferta.usuarioEmisor,
        nuevoPropietario: oferta.usuarioReceptor
      })),
      ...(oferta.librosSolicitados || []).map(libro => ({
        libro,
        propietarioActual: oferta.usuarioReceptor,
        nuevoPropietario: oferta.usuarioEmisor
      }))
    ];
    const ids = new Set();
    const almacenados = new Map(this._persistencia.buscarTodos().map(libro => [String(libro.id), libro]));

    const librosActualizados = movimientos.map(({ libro, propietarioActual, nuevoPropietario }) => {
      if (!libro?.id || !libro.titulo || ids.has(String(libro.id))) {
        throw new Error('La oferta contiene libros inválidos o repetidos.');
      }
      ids.add(String(libro.id));
      const existente = almacenados.get(String(libro.id));
      if (existente?.propietario &&
          existente.propietario.toLowerCase() !== propietarioActual.toLowerCase()) {
        throw new Error(`El libro "${libro.titulo}" ya no pertenece al usuario de la oferta.`);
      }

      const autores = libro.autores || (libro.autor ? [libro.autor] : []);
      const categorias = libro.categorias || (libro.categoria ? [libro.categoria] : []);
      const actualizado = new Libro({
        ...(existente ? existente.toJSON() : libro),
        id: libro.id,
        autores,
        categorias,
        propietario: nuevoPropietario,
        disponible: true
      });
      const errorValidacion = actualizado.validar();
      if (errorValidacion) throw new Error(errorValidacion);
      return actualizado;
    });

    this._persistencia.guardarVarios(librosActualizados);
    return librosActualizados.map(libro => libro.toJSON());
  }

  /*
    Consulta Google Books a través del servicio inyectado para sugerir libros oficiales.
  */
  async sugerirDesdeGoogle(termino, limite = 10) {
    if (!this._googleBooksService) {
      throw new Error('El servicio de Google Books no está configurado en este repositorio.');
    }
    const libros = await this._googleBooksService.buscarPorTexto(termino, { maxResults: limite });
    return libros.map(libro => libro.toJSON());
  }
}

module.exports = LibroRepository;
