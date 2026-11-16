/*
  Archivo: google-books.service.ts (FRONTEND: front/src/app/servicios/)
  Servicio: GoogleBooksService
  Función: Servicio Angular que consume Google Books API v1 para alimentar
           el Catálogo Global de Libros y soportar búsquedas, filtros y paginación.
           Integra caché en memoria para cumplir el requisito de eficiencia (< 15 seg).
           También gestiona el inventario personal del usuario (localStorage).
*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Libro } from '../modelos/intercambio.model';

// Interfaz para la estructura de volumen de Google Books API
export interface GoogleBookItem {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    categories?: string[];
    pageCount?: number;
    publishedDate?: string;
    publisher?: string;
  };
}

// Interfaz para la respuesta cruda de Google Books
export interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBookItem[];
}

// Resultado paginado con metadatos para la vista
export interface ResultadoCatalogo {
  libros: Libro[];
  totalEncontrados: number;
}

// Interfaz para la respuesta al añadir un libro al inventario
export interface RespuestaAñadirLibro {
  libro: {
    id: string;
    titulo: string;
    autores?: string[];
    disponible: boolean;
    portadaUrl?: string;
    descripcion?: string;
    isbn?: string;
    categorias?: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoogleBooksService {
  // URL base oficial de la API de Google Books
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  // Caché en memoria para optimizar tiempo de respuesta y evitar peticiones repetitivas
  private cacheBusqueda = new Map<string, ResultadoCatalogo>();
  // Caché en memoria del inventario por usuario
  private cacheInventario = new Map<string, Libro[]>();

  constructor(private http: HttpClient) {}

  /*
    Busca libros en Google Books por término con soporte de paginación.
  */
  public buscarLibrosPaginados(
    termino: string,
    maxResults: number = 12,
    startIndex: number = 0
  ): Observable<ResultadoCatalogo> {
    const q = termino ? termino.trim() : 'libros clasicos literatura';
    const claveCache = `${q}_${maxResults}_${startIndex}`;

    // Si ya está en caché, retornamos inmediatamente (RNF Eficiencia de desempeño)
    if (this.cacheBusqueda.has(claveCache)) {
      return of(this.cacheBusqueda.get(claveCache)!);
    }

    const url = `${this.baseUrl}?q=${encodeURIComponent(q)}&maxResults=${maxResults}&startIndex=${startIndex}&langRestrict=es`;

    return this.http.get<GoogleBooksResponse>(url).pipe(
      map(res => {
        const total = res.totalItems || 0;
        if (!res.items || res.items.length === 0) {
          const resultadoVacio: ResultadoCatalogo = { libros: [], totalEncontrados: total };
          this.cacheBusqueda.set(claveCache, resultadoVacio);
          return resultadoVacio;
        }

        // Mapeo a instancias de la clase Libro (POO)
        const libros = res.items
          .filter(item => item.volumeInfo && item.volumeInfo.title)
          .map(item => this.mapearALibro(item));

        const resultado: ResultadoCatalogo = { libros, totalEncontrados: total };
        this.cacheBusqueda.set(claveCache, resultado);
        return resultado;
      }),
      catchError(error => {
        console.warn('[GoogleBooksService] Error al conectar con Google Books API:', error.message);
        return of({ libros: [], totalEncontrados: 0 });
      })
    );
  }

  /*
    Busca libros de forma simple devolviendo solo la lista de Libro
  */
  public buscarLibros(termino: string, maxResults: number = 12): Observable<Libro[]> {
    return this.buscarLibrosPaginados(termino, maxResults, 0).pipe(
      map(res => res.libros)
    );
  }

  /*
    Catálogo inicial por defecto con literatura destacada
  */
  public obtenerCatalogoInicial(maxResults: number = 12, startIndex: number = 0): Observable<ResultadoCatalogo> {
    return this.buscarLibrosPaginados('ficcion clasicos novela hispanoamericana', maxResults, startIndex);
  }

  /*
    Busca libros por categoría literaria (Restricción 3.8 del Brief)
  */
  public buscarPorCategoria(categoria: string, maxResults: number = 12, startIndex: number = 0): Observable<ResultadoCatalogo> {
    if (!categoria || categoria === 'Todos') {
      return this.obtenerCatalogoInicial(maxResults, startIndex);
    }
    const query = `subject:${encodeURIComponent(categoria)}`;
    return this.buscarLibrosPaginados(query, maxResults, startIndex);
  }

  /*
    Obtiene el inventario de libros del usuario desde caché o localStorage.
    Retorna null si no hay datos (carga inicial sin datos).
  */
  public obtenerInventarioEnCache(usuario: string): Libro[] | null {
    // Primero revisar la caché en memoria
    if (this.cacheInventario.has(usuario)) {
      return this.cacheInventario.get(usuario)!;
    }
    // Luego revisar localStorage
    try {
      const guardado = localStorage.getItem(`inventario_${usuario}`);
      if (guardado) {
        const parsed: Libro[] = JSON.parse(guardado);
        this.cacheInventario.set(usuario, parsed);
        return parsed;
      }
    } catch {
      console.warn('[GoogleBooksService] Error leyendo inventario de localStorage');
    }
    return null;
  }

  /*
    Actualiza el inventario en caché de memoria y en localStorage
  */
  public actualizarInventarioEnCache(usuario: string, libros: Libro[]): void {
    this.cacheInventario.set(usuario, libros);
    try {
      localStorage.setItem(`inventario_${usuario}`, JSON.stringify(libros));
    } catch {
      console.warn('[GoogleBooksService] No se pudo guardar inventario en localStorage');
    }
  }

  /*
    Obtiene el inventario del usuario desde localStorage (simula llamada al backend).
  */
  public obtenerInventarioUsuario(usuario: string): Observable<Libro[]> {
    try {
      const guardado = localStorage.getItem(`inventario_${usuario}`);
      if (guardado) {
        const libros: Libro[] = JSON.parse(guardado);
        this.cacheInventario.set(usuario, libros);
        return of(libros);
      }
      // Inventario vacío por defecto para usuarios nuevos
      return of([]);
    } catch {
      return throwError(() => new Error('No se pudo cargar el inventario del usuario.'));
    }
  }

  /*
    Añade un libro al inventario del usuario (simula llamada al backend via localStorage).
    Valida duplicados y retorna una respuesta compatible con RespuestaAñadirLibro.
  */
  public añadirLibroAInventario(libro: Libro, usuario: string): Observable<RespuestaAñadirLibro> {
    try {
      const nuevoId = `inv_${usuario}_${Date.now()}`;
      const libroConId = new Libro(
        nuevoId,
        libro.titulo,
        libro.autor,
        libro.disponible,
        libro.portadaUrl,
        libro.descripcion,
        libro.isbn,
        libro.categoria
      );

      // Cargar inventario actual
      const inventarioActual = this.obtenerInventarioEnCache(usuario) || [];

      // Validar que no exista un libro con el mismo título y autor
      const duplicado = inventarioActual.some(
        l => l.titulo.toLowerCase() === libro.titulo.toLowerCase() &&
             l.autor.toLowerCase() === libro.autor.toLowerCase()
      );
      if (duplicado) {
        return throwError(() => ({ error: { error: 'Ya tienes este libro en tu inventario.' } }));
      }

      const inventarioActualizado = [libroConId, ...inventarioActual];
      this.actualizarInventarioEnCache(usuario, inventarioActualizado);

      // Respuesta simulada compatible con RespuestaAñadirLibro
      const respuesta: RespuestaAñadirLibro = {
        libro: {
          id: nuevoId,
          titulo: libroConId.titulo,
          autores: [libroConId.autor],
          disponible: true,
          portadaUrl: libroConId.portadaUrl,
          descripcion: libroConId.descripcion,
          isbn: libroConId.isbn,
          categorias: [libroConId.categoria]
        }
      };
      return of(respuesta);
    } catch {
      return throwError(() => new Error('Error al añadir el libro al inventario.'));
    }
  }

  /*
    Mapea un volumen crudo de Google Books a la clase orientada a objetos Libro
  */
  private mapearALibro(item: GoogleBookItem): Libro {
    const info = item.volumeInfo;
    const autores = info.authors && info.authors.length > 0
      ? info.authors.join(', ')
      : 'Autor Desconocido';

    const isbnObj = info.industryIdentifiers?.find(id => id.type === 'ISBN_13') ||
                    info.industryIdentifiers?.find(id => id.type === 'ISBN_10') ||
                    info.industryIdentifiers?.[0];

    let portada = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
    if (portada.startsWith('http://')) {
      portada = portada.replace('http://', 'https://');
    }

    return new Libro(
      item.id,
      info.title || 'Sin Título',
      autores,
      true,
      portada,
      info.description || 'Sin descripción disponible para esta obra.',
      isbnObj ? isbnObj.identifier : 'S/N',
      info.categories?.[0] || 'Literatura'
    );
  }
}
