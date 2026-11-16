/*
  Archivo: LibroController.js (BACKEND: back/controllers/)
  Clase: LibroController
  Función: Controlador orientado a objetos que orquesta los casos de uso de gestión
           de libros (catálogo global, inventario personal y búsqueda externa con Google Books).
*/

const LibroRepository = require('../Repositorio/LibroRepository');
const Libro = require('../models/Libro');

class LibroController {
  constructor(libroRepository = new LibroRepository()) {
    this._libroRepository = libroRepository;
  }

  get libroRepository() {
    return this._libroRepository;
  }

  /*
    HU: Explorar catálogo global de libros disponibles
  */
  obtenerCatalogoGlobal(filtro = '') {
    if (filtro && filtro.trim()) {
      return this._libroRepository.buscarEnCatalogo(filtro.trim());
    }
    return this._libroRepository.obtenerCatalogoGlobal();
  }

  /*
    HU: Consultar libros del inventario de un usuario específico
  */
  obtenerInventarioUsuario(usuario) {
    if (!usuario || typeof usuario !== 'string') {
      throw new Error('Debe especificar un usuario válido para consultar su inventario.');
    }
    return this._libroRepository.obtenerLibrosPorUsuario(usuario.trim());
  }

  /*
    HU: Buscar libros en Google Books API para sugerencias o nuevo registro
  */
  async buscarEnGoogleBooks(termino) {
    if (!termino || typeof termino !== 'string' || !termino.trim()) {
      throw new Error('Debe ingresar un término de búsqueda para consultar en Google Books.');
    }
    return await this._libroRepository.sugerirDesdeGoogle(termino.trim());
  }

  /*
    HU: Añadir libro al inventario propio
    Restricción 3.5: Solo usuarios autenticados pueden registrar libros en su inventario.
  */
  agregarLibroAInventario(datosLibro, usuarioSesion) {
    if (!usuarioSesion || typeof usuarioSesion !== 'string' || !usuarioSesion.trim()) {
      throw new Error('Debe iniciar sesión para agregar libros a su inventario.');
    }

    if (!datosLibro || typeof datosLibro !== 'object') {
      throw new Error('Datos del libro inválidos.');
    }

    // Instancia el objeto de dominio asignando al usuario en sesión como propietario
    const nuevoLibro = new Libro({
      id: datosLibro.id || null,
      titulo: datosLibro.titulo,
      autores: datosLibro.autores,
      descripcion: datosLibro.descripcion,
      portadaUrl: datosLibro.portadaUrl,
      isbn: datosLibro.isbn,
      categorias: datosLibro.categorias,
      disponible: true,
      propietario: usuarioSesion.trim()
    });

    const errorValidacion = nuevoLibro.validar();
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }

    return this._libroRepository.registrarLibro(nuevoLibro);
  }

  /*
    HU: Modificar disponibilidad del libro (p. ej. al entrar o salir de intercambio)
    Restricción 3.4: Un libro sólo puede formar parte de un intercambio activo a la vez.
  */
  actualizarDisponibilidadLibro(idLibro, disponible, usuarioSesion) {
    if (!usuarioSesion) {
      throw new Error('Debe iniciar sesión para modificar libros.');
    }

    const libroActual = this._libroRepository.obtenerPorId(idLibro);
    if (!libroActual) {
      throw new Error('El libro especificado no existe.');
    }

    // Confidencialidad y permisos: solo el propietario puede modificar su libro
    if (libroActual.propietario && libroActual.propietario.toLowerCase() !== usuarioSesion.toLowerCase()) {
      throw new Error('No tiene permisos para modificar la disponibilidad de este libro.');
    }

    return this._libroRepository.actualizarDisponibilidad(idLibro, disponible);
  }
}

module.exports = LibroController;
