/*
  Archivo: Libro.js (BACKEND: back/models/)
  Clase: Libro
  Función: Objeto de dominio que modela un libro en la plataforma Swop-For-All.
           Diseñado bajo el paradigma Orientado a Objetos con validaciones y métodos propios.
*/

class Libro {
  constructor({
    id = null,
    titulo = '',
    autores = [],
    descripcion = '',
    portadaUrl = '',
    isbn = '',
    categorias = [],
    disponible = true,
    propietario = null,
    fechaRegistro = new Date().toISOString()
  } = {}) {
    this._id = id ? String(id).trim() : this._generarId();
    this._titulo = String(titulo ?? '').trim();
    this._autores = Array.isArray(autores)
      ? autores.map(a => String(a).trim()).filter(Boolean)
      : (autores ? [String(autores).trim()] : ['Autor Desconocido']);
    this._descripcion = String(descripcion ?? '').trim();
    this._portadaUrl = String(portadaUrl ?? '').trim();
    this._isbn = String(isbn ?? '').trim();
    this._categorias = Array.isArray(categorias)
      ? categorias.map(c => String(c).trim()).filter(Boolean)
      : (categorias ? [String(categorias).trim()] : ['General']);
    this._disponible = Boolean(disponible);
    this._propietario = propietario ? String(propietario).trim() : null;
    this._fechaRegistro = fechaRegistro;
  }

  // Getters para encapsulamiento
  get id() { return this._id; }
  get titulo() { return this._titulo; }
  get autores() { return [...this._autores]; }
  get descripcion() { return this._descripcion; }
  get portadaUrl() { return this._portadaUrl; }
  get isbn() { return this._isbn; }
  get categorias() { return [...this._categorias]; }
  get disponible() { return this._disponible; }
  get propietario() { return this._propietario; }
  get fechaRegistro() { return this._fechaRegistro; }

  // Setters controlados
  set propietario(nuevoPropietario) {
    if (!nuevoPropietario || typeof nuevoPropietario !== 'string') {
      throw new Error('El propietario debe ser un nombre de usuario válido.');
    }
    this._propietario = nuevoPropietario.trim();
  }

  // Métodos de negocio
  marcarDisponible(estado) {
    this._disponible = Boolean(estado);
  }

  obtenerAutoresTexto() {
    if (!this._autores || this._autores.length === 0) return 'Autor Desconocido';
    return this._autores.join(', ');
  }

  // Validación de integridad del libro
  validar() {
    if (!this._titulo || this._titulo.length === 0) {
      return 'El título del libro es obligatorio.';
    }
    if (this._titulo.length > 250) {
      return 'El título no puede superar los 250 caracteres.';
    }
    return null; // Válido
  }

  // Serialización a objeto plano (DTO) para envío o almacenamiento
  toJSON() {
    return {
      id: this._id,
      titulo: this._titulo,
      autores: this._autores,
      autoresTexto: this.obtenerAutoresTexto(),
      descripcion: this._descripcion,
      portadaUrl: this._portadaUrl,
      isbn: this._isbn,
      categorias: this._categorias,
      disponible: this._disponible,
      propietario: this._propietario,
      fechaRegistro: this._fechaRegistro
    };
  }

  // Generador auxiliar de identificador si no se proporciona
  _generarId() {
    return `lib_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // Método de fábrica para instanciar Libro a partir de un volumen de Google Books
  static desdeGoogleBooks(volumen, propietario = null) {
    if (!volumen || !volumen.volumeInfo) {
      throw new Error('Formato de volumen de Google Books inválido.');
    }

    const info = volumen.volumeInfo;
    const identificadores = info.industryIdentifiers || [];
    const isbnObj = identificadores.find(id => id.type === 'ISBN_13') ||
                    identificadores.find(id => id.type === 'ISBN_10') ||
                    identificadores[0];

    const portada = info.imageLinks?.thumbnail ||
                    info.imageLinks?.smallThumbnail ||
                    '';

    return new Libro({
      id: volumen.id || null,
      titulo: info.title || 'Título Desconocido',
      autores: info.authors && info.authors.length > 0 ? info.authors : ['Autor Desconocido'],
      descripcion: info.description || 'Sin descripción disponible.',
      portadaUrl: portada.replace('http://', 'https://'), // Forzar HTTPS para seguridad
      isbn: isbnObj ? isbnObj.identifier : '',
      categorias: info.categories || ['General'],
      disponible: true,
      propietario: propietario
    });
  }
}

module.exports = Libro;
