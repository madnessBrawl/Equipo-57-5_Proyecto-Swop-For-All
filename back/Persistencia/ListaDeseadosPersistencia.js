const PersistenciaJSON = require('./PersistenciaJSON');

class ListaDeseadosPersistencia extends PersistenciaJSON {
  constructor(datosIniciales = [], nombreArchivo = 'libros-deseados.json') {
    super(nombreArchivo, datosIniciales);
  }

  buscarPorUsuario(usuario) {
    const usuarioNormalizado = this._normalizarUsuario(usuario);
    return this.obtenerTodos().filter(libro =>
      this._normalizarUsuario(libro.usuario) === usuarioNormalizado
    );
  }

  agregar(usuario, datos) {
    const usuarioNormalizado = this._normalizarUsuario(usuario);
    if (!usuarioNormalizado) {
      throw new Error('Debe iniciar sesión para agregar libros deseados.');
    }
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
      throw new Error('Los datos del libro deseado no son válidos.');
    }

    const titulo = typeof datos.titulo === 'string' ? datos.titulo.trim() : '';
    const autor = typeof datos.autor === 'string' ? datos.autor.trim() : '';
    const anio = datos.anio == null || datos.anio === '' ? null : Number(datos.anio);
    if (!titulo || titulo.length > 250) {
      throw new Error('El título es obligatorio y no debe superar 250 caracteres.');
    }
    if (autor.length > 200) {
      throw new Error('El autor no debe superar 200 caracteres.');
    }
    if (anio !== null && (!Number.isInteger(anio) || anio < 0 || anio > 9999)) {
      throw new Error('El año debe ser un número entero válido.');
    }

    return this.guardar({
      id: `des_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      usuario: usuarioNormalizado,
      titulo,
      autor,
      anio
    });
  }

  eliminarDeUsuario(id, usuario) {
    const usuarioNormalizado = this._normalizarUsuario(usuario);
    const libro = this.buscarPorId(id);
    if (!libro || this._normalizarUsuario(libro.usuario) !== usuarioNormalizado) {
      return false;
    }
    return this.eliminar(id);
  }

  _normalizarUsuario(usuario) {
    return typeof usuario === 'string' ? usuario.trim().toLowerCase() : '';
  }
}

module.exports = ListaDeseadosPersistencia;
