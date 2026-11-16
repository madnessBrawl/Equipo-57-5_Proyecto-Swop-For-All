/*
  Archivo: GoogleBooksService.js (BACKEND: back/Service/)
  Clase: GoogleBooksService
  Función: Servicio que encapsula la comunicación externa con Google Books API v1.
           Aplica el paradigma POO y transforma las respuestas crudas en instancias
           de la clase de dominio Libro.
*/

const Libro = require('../models/Libro');

class GoogleBooksService {
  constructor({ baseUrl = 'https://www.googleapis.com/books/v1/volumes', fetchClient = globalThis.fetch } = {}) {
    this._baseUrl = baseUrl;
    this._fetch = fetchClient;
    this._cache = new Map(); // Caché en memoria para optimizar tiempo de respuesta (< 3s)
  }

  /*
    Busca libros en Google Books por término (título, autor o tema).
    Retorna una lista de instancias de la clase Libro.
  */
  async buscarPorTexto(termino, { maxResults = 10, startIndex = 0, idioma = 'es' } = {}) {
    if (!termino || typeof termino !== 'string' || !termino.trim()) {
      return [];
    }

    const queryLimpia = termino.trim();
    const claveCache = `query:${queryLimpia}:${maxResults}:${startIndex}:${idioma}`;

    if (this._cache.has(claveCache)) {
      return this._cache.get(claveCache);
    }

    const url = new URL(this._baseUrl);
    url.searchParams.set('q', queryLimpia);
    url.searchParams.set('maxResults', String(Math.min(Math.max(Number(maxResults) || 10, 1), 40)));
    url.searchParams.set('startIndex', String(Math.max(Number(startIndex) || 0, 0)));
    if (idioma) {
      url.searchParams.set('langRestrict', idioma);
    }

    try {
      const respuesta = await this._fetch(url.toString(), {
        headers: { 'Accept': 'application/json' }
      });

      if (!respuesta.ok) {
        throw new Error(`Error en Google Books API: ${respuesta.status} ${respuesta.statusText}`);
      }

      const data = await respuesta.json();

      if (!data.items || !Array.isArray(data.items)) {
        this._cache.set(claveCache, []);
        return [];
      }

      // Transformar cada volumen de Google en una instancia de la clase Libro
      const libros = data.items
        .filter(item => item && item.volumeInfo && item.volumeInfo.title)
        .map(item => Libro.desdeGoogleBooks(item));

      this._cache.set(claveCache, libros);
      return libros;
    } catch (error) {
      console.error(`[GoogleBooksService] Error al buscar "${termino}":`, error.message);
      throw error;
    }
  }

  /*
    Busca un libro específico por su código ISBN.
    Retorna una instancia de Libro o null si no se encuentra.
  */
  async buscarPorIsbn(isbn) {
    if (!isbn || typeof isbn !== 'string') {
      return null;
    }

    const isbnLimpio = isbn.replace(/[-\s]/g, '').trim();
    if (!isbnLimpio) return null;

    const claveCache = `isbn:${isbnLimpio}`;
    if (this._cache.has(claveCache)) {
      return this._cache.get(claveCache);
    }

    const resultados = await this.buscarPorTexto(`isbn:${isbnLimpio}`, { maxResults: 1 });
    const libro = resultados.length > 0 ? resultados[0] : null;

    this._cache.set(claveCache, libro);
    return libro;
  }

  /*
    Obtiene los detalles de un libro por su ID único de Google Books.
  */
  async obtenerPorId(volumeId) {
    if (!volumeId || typeof volumeId !== 'string') {
      return null;
    }

    const idLimpio = volumeId.trim();
    const claveCache = `id:${idLimpio}`;
    if (this._cache.has(claveCache)) {
      return this._cache.get(claveCache);
    }

    const url = `${this._baseUrl}/${encodeURIComponent(idLimpio)}`;

    try {
      const respuesta = await this._fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!respuesta.ok) {
        if (respuesta.status === 404) return null;
        throw new Error(`Error al consultar volumen en Google Books: ${respuesta.status}`);
      }

      const item = await respuesta.json();
      const libro = Libro.desdeGoogleBooks(item);
      this._cache.set(claveCache, libro);
      return libro;
    } catch (error) {
      console.error(`[GoogleBooksService] Error al obtener volumen ${idLimpio}:`, error.message);
      throw error;
    }
  }

  // Limpiar caché si es necesario
  limpiarCache() {
    this._cache.clear();
  }
}

module.exports = GoogleBooksService;
