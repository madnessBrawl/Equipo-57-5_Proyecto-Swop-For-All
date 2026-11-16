/*
  Archivo: intercambioModel.js (BACKEND: back/models/)
  Clase: OfertaIntercambio
  Función: Modela una propuesta u oferta de intercambio entre dos lectores.
           Diseñado bajo el paradigma Orientado a Objetos (Diseño 3 / C4 - Nivel Código).
*/

class OfertaIntercambio {
  constructor({
    idIntercambio = null,
    usuarioEmisor = '',
    usuarioReceptor = '',
    librosOfrecidos = [],
    librosSolicitados = [],
    estado = 'Pendiente',
    fechaCreacion = new Date().toISOString()
  } = {}) {
    this._idIntercambio = idIntercambio || `INT-${Date.now().toString(36)}`;
    this._usuarioEmisor = String(usuarioEmisor || '').trim();
    this._usuarioReceptor = String(usuarioReceptor || '').trim();
    this._librosOfrecidos = Array.isArray(librosOfrecidos) ? [...librosOfrecidos] : [];
    this._librosSolicitados = Array.isArray(librosSolicitados) ? [...librosSolicitados] : [];
    this._estado = estado;
    this._fechaCreacion = fechaCreacion;
  }

  // Getters para encapsulamiento
  get idIntercambio() { return this._idIntercambio; }
  get usuarioEmisor() { return this._usuarioEmisor; }
  get usuarioReceptor() { return this._usuarioReceptor; }
  get librosOfrecidos() { return [...this._librosOfrecidos]; }
  get librosSolicitados() { return [...this._librosSolicitados]; }
  get estado() { return this._estado; }
  get fechaCreacion() { return this._fechaCreacion; }

  // Setters controlados
  set estado(nuevoEstado) {
    const estadosValidos = ['Pendiente', 'Aceptada', 'Rechazada', 'Cancelada', 'Finalizado', 'Modificada'];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error(`Estado "${nuevoEstado}" no es válido para una oferta.`);
    }
    this._estado = nuevoEstado;
  }

  // Métodos de negocio
  agregarLibroOfrecido(libro) {
    if (!libro) throw new Error('Debe proporcionar un libro válido.');
    this._librosOfrecidos.push(libro);
  }

  retirarLibroOfrecido(idLibro) {
    this._librosOfrecidos = this._librosOfrecidos.filter(l => (l.id || l) !== idLibro);
  }

  agregarLibroSolicitado(libro) {
    if (!libro) throw new Error('Debe proporcionar un libro válido.');
    this._librosSolicitados.push(libro);
  }

  retirarLibroSolicitado(idLibro) {
    this._librosSolicitados = this._librosSolicitados.filter(l => (l.id || l) !== idLibro);
  }

  // Validación de reglas de negocio
  validar() {
    if (!this._usuarioEmisor) {
      return 'El usuario emisor es obligatorio.';
    }
    if (!this._usuarioReceptor) {
      return 'El usuario receptor es obligatorio.';
    }
    if (this._usuarioEmisor.toLowerCase() === this._usuarioReceptor.toLowerCase()) {
      return 'No puede realizar un intercambio consigo mismo.';
    }
    if (this._librosSolicitados.length === 0) {
      return 'Debe solicitar al menos un libro del catálogo o inventario del receptor.';
    }
    return null;
  }

  // Serialización a objeto plano
  toJSON() {
    return {
      idIntercambio: this._idIntercambio,
      usuarioEmisor: this._usuarioEmisor,
      usuarioReceptor: this._usuarioReceptor,
      librosOfrecidos: this._librosOfrecidos,
      librosSolicitados: this._librosSolicitados,
      estado: this._estado,
      fechaCreacion: this._fechaCreacion
    };
  }
}

module.exports = OfertaIntercambio;
