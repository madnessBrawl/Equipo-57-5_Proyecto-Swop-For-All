/*
  Archivo: LibroController.js (BACKEND: back/controllers/)
  Clase: LibroController
  Función: Controlador orientado a objetos que implementa el flujo MVC del diagrama de secuencia:
           Front -> Controllers -> Models -> Service -> Repositorio -> Persistencia (JSON)
*/

const Libro = require('../models/Libro');
const LibroService = require('../Service/LibroService');
const LibroRepository = require('../Repositorio/LibroRepository');
const GoogleBooksService = require('../Service/GoogleBooksService');

class LibroController {
  constructor(servicioORepositorio = null) {
    if (servicioORepositorio instanceof LibroService) {
      this._libroService = servicioORepositorio;
    } else if (servicioORepositorio instanceof LibroRepository) {
      this._libroService = new LibroService(servicioORepositorio);
    } else if (servicioORepositorio && typeof servicioORepositorio.verificacionesYAñadir === 'function') {
      this._libroService = servicioORepositorio;
    } else if (servicioORepositorio && typeof servicioORepositorio.registrarLibro === 'function') {
      this._libroService = new LibroService(servicioORepositorio);
    } else {
      const googleService = new GoogleBooksService();
      const repository = new LibroRepository({ googleBooksService: googleService });
      this._libroService = new LibroService(repository);
    }
  }

  get libroService() {
    return this._libroService;
  }

  get libroRepository() {
    return this._libroService.libroRepository;
  }

  /*
    Flujo del diagrama UML:
    Controllers -> Models: AñadirLibro (POST)
    Models -> Service: Verificaciones(Libro)
    Service -> Repositorio: TodoOK -> Persistencia (JSON): guardar()
    Retorno: "mensaje: libro añadido exitosamente"
  */
  agregarLibroAInventario(datosLibro, usuarioSesion) {
    if (!usuarioSesion || typeof usuarioSesion !== 'string' || !usuarioSesion.trim()) {
      throw new Error('Debe iniciar sesión para agregar libros a su inventario.');
    }

    if (!datosLibro || typeof datosLibro !== 'object') {
      throw new Error('Datos del libro inválidos.');
    }

    const isbn = datosLibro.isbn == null ? '' : String(datosLibro.isbn).trim();
    if (isbn && !/^\d{13}$/.test(isbn)) {
      throw new Error('El ISBN debe tener exactamente 13 dígitos.');
    }

    // 1. Controllers -> Models: Instanciación de la clase Libro (objeto de dominio)
    const libroInstancia = new Libro({
      id: datosLibro.id || null,
      titulo: datosLibro.titulo,
      autores: datosLibro.autores,
      descripcion: datosLibro.descripcion,
      portadaUrl: datosLibro.portadaUrl,
      isbn,
      categorias: datosLibro.categorias,
      disponible: true,
      propietario: usuarioSesion.trim()
    });

    // 2. Models -> Service: Verificaciones y persistencia en cascada
    const resultado = this._libroService.verificacionesYAñadir(libroInstancia, usuarioSesion.trim());

    // 3. Controllers -> Front: Respuesta con mensaje exacto del diagrama
    return {
      mensaje: 'libro añadido exitosamente',
      ...resultado.libro,
      libro: resultado.libro
    };
  }

  /*
    HU: Explorar catálogo global de libros disponibles
  */
  obtenerCatalogoGlobal(filtro = '') {
    return this._libroService.obtenerCatalogo(filtro);
  }

  /*
    HU: Consultar libros del inventario de un usuario específico
  */
  obtenerInventarioUsuario(usuario) {
    if (!usuario || typeof usuario !== 'string') {
      throw new Error('Debe especificar un usuario válido para consultar su inventario.');
    }
    return this._libroService.obtenerInventario(usuario.trim());
  }

  /*
    HU: Buscar libros en Google Books API para sugerencias
  */
  async buscarEnGoogleBooks(termino) {
    if (!termino || typeof termino !== 'string' || !termino.trim()) {
      throw new Error('Debe ingresar un término de búsqueda para consultar en Google Books.');
    }
    return await this._libroService.buscarEnGoogleBooks(termino.trim());
  }

  /*
    HU: Modificar disponibilidad del libro
  */
  actualizarDisponibilidadLibro(idLibro, disponible, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para modificar libros.');
    }

    const libroActual = this.libroRepository.obtenerPorId(idLibro);
    if (!libroActual) {
      throw new Error('El libro especificado no existe.');
    }

    if (libroActual.propietario && libroActual.propietario.toLowerCase() !== usuarioSesion.toLowerCase()) {
      throw new Error('No tiene permisos para modificar la disponibilidad de este libro.');
    }

    return this.libroRepository.actualizarDisponibilidad(idLibro, disponible);
  }
}

module.exports = LibroController;
