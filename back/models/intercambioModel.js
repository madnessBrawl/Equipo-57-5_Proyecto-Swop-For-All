/*
  Archivo: intercambioModel.js (BACKEND: back/models/)
  Clase: OfertaIntercambio
  Función: Modela una propuesta u oferta de intercambio entre dos lectores.
           Diseñado bajo el paradigma Orientado a Objetos (Diseño 3 / C4 - Nivel Código).
*/

class OfertaIntercambio {
  constructor({
    id = null,
    idIntercambio = null,
    usuarioEmisor = '',
    usuarioReceptor = '',
    librosOfrecidos = [],
    librosSolicitados = [],
    estado = 'Pendiente',
    mensajes = [],
    fechaCreacion = new Date().toISOString(),
    fechaModificacion = new Date().toISOString()
  } = {}) {
    const idFinal = id || idIntercambio || `INT-${Date.now().toString(36)}`;
    this._id = idFinal;
    this._idIntercambio = idFinal;
    this._usuarioEmisor = String(usuarioEmisor || '').trim();
    this._usuarioReceptor = String(usuarioReceptor || '').trim();
    this._librosOfrecidos = Array.isArray(librosOfrecidos) ? [...librosOfrecidos] : [];
    this._librosSolicitados = Array.isArray(librosSolicitados) ? [...librosSolicitados] : [];
    this._estado = estado;
    this._mensajes = Array.isArray(mensajes) ? [...mensajes] : [];
    this._fechaCreacion = fechaCreacion;
    this._fechaModificacion = fechaModificacion;
  }

  // Getters para encapsulamiento
  get id() { return this._id; }
  get idIntercambio() { return this._idIntercambio; }
  get usuarioEmisor() { return this._usuarioEmisor; }
  get usuarioReceptor() { return this._usuarioReceptor; }
  get librosOfrecidos() { return [...this._librosOfrecidos]; }
  get librosSolicitados() { return [...this._librosSolicitados]; }
  get estado() { return this._estado; }
  get mensajes() { return [...this._mensajes]; }
  get fechaCreacion() { return this._fechaCreacion; }
  get fechaModificacion() { return this._fechaModificacion; }

  // Setters controlados
  set estado(nuevoEstado) {
    const estadosValidos = ['Pendiente', 'Aceptada', 'Rechazada', 'Cancelada', 'Finalizado', 'Modificada'];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error(`Estado "${nuevoEstado}" no es válido para una oferta.`);
    }
    this._estado = nuevoEstado;
    this._fechaModificacion = new Date().toISOString();
  }

  // Métodos de negocio para manipulación de libros en la oferta
  agregarLibroOfrecido(libro) {
    if (!libro) throw new Error('Debe proporcionar un libro válido.');
    const idLibro = typeof libro === 'object' ? libro.id : libro;
    const yaExiste = this._librosOfrecidos.some(l => (typeof l === 'object' ? l.id : l) === idLibro);
    if (!yaExiste) {
      this._librosOfrecidos.push(libro);
      this._fechaModificacion = new Date().toISOString();
    }
  }

  retirarLibroOfrecido(idLibro) {
    this._librosOfrecidos = this._librosOfrecidos.filter(l => (typeof l === 'object' ? l.id : l) !== idLibro);
    this._fechaModificacion = new Date().toISOString();
  }

  agregarLibroSolicitado(libro) {
    if (!libro) throw new Error('Debe proporcionar un libro válido.');
    const idLibro = typeof libro === 'object' ? libro.id : libro;
    const yaExiste = this._librosSolicitados.some(l => (typeof l === 'object' ? l.id : l) === idLibro);
    if (!yaExiste) {
      this._librosSolicitados.push(libro);
      this._fechaModificacion = new Date().toISOString();
    }
  }

  retirarLibroSolicitado(idLibro) {
    this._librosSolicitados = this._librosSolicitados.filter(l => (typeof l === 'object' ? l.id : l) !== idLibro);
    this._fechaModificacion = new Date().toISOString();
  }

  actualizarLibros({ librosOfrecidos, librosSolicitados }) {
    if (Array.isArray(librosOfrecidos)) {
      this._librosOfrecidos = [...librosOfrecidos];
    }
    if (Array.isArray(librosSolicitados)) {
      this._librosSolicitados = [...librosSolicitados];
    }
    this._estado = 'Modificada';
    this._fechaModificacion = new Date().toISOString();
  }

  // HU: Chat de Intercambio (gestión de mensajes con validación y límite de 250 caracteres)
  agregarMensaje({ remitente, texto }) {
    const usuario = String(remitente || '').trim();
    const contenido = String(texto || '').trim();

    if (!usuario) {
      throw new Error('El remitente del mensaje es obligatorio.');
    }
    if (usuario !== this._usuarioEmisor && usuario !== this._usuarioReceptor) {
      throw new Error('Solo los usuarios participantes de este intercambio pueden enviar mensajes.');
    }
    if (!contenido) {
      throw new Error('El mensaje no puede estar vacío.');
    }
    if (contenido.length > 250) {
      throw new Error('El mensaje excede el límite permitido de 250 caracteres.');
    }

    const nuevoMensaje = {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      remitente: usuario,
      texto: contenido,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toISOString()
    };

    this._mensajes.push(nuevoMensaje);
    this._fechaModificacion = new Date().toISOString();
    return nuevoMensaje;
  }

  // Validación de reglas de negocio de la oferta
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

  // Serialización a objeto plano DTO
  toJSON() {
    return {
      id: this._id,
      idIntercambio: this._idIntercambio,
      usuarioEmisor: this._usuarioEmisor,
      usuarioReceptor: this._usuarioReceptor,
      librosOfrecidos: this._librosOfrecidos,
      librosSolicitados: this._librosSolicitados,
      estado: this._estado,
      mensajes: this._mensajes,
      fechaCreacion: this._fechaCreacion,
      fechaModificacion: this._fechaModificacion
    };
  }
}

module.exports = OfertaIntercambio;
