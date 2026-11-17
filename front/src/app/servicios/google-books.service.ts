/*
  Archivo: google-books.service.ts (FRONTEND: front/src/app/servicios/)
  Servicio: GoogleBooksService
  Función: Servicio Angular que consume Google Books API v1 para alimentar
           el Catálogo Global de Libros y soportar búsquedas, filtros y paginación.
           Integra caché en memoria para cumplir el requisito de eficiencia (< 15 seg).
           También gestiona el inventario personal del usuario (localStorage).
*/

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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

interface LibroBackend {
  id: string;
  titulo: string;
  autor?: string;
  autores?: string[];
  disponible?: boolean;
  portadaUrl?: string;
  descripcion?: string;
  isbn?: string;
  categoria?: string;
  categorias?: string[];
  propietario?: string | null;
}

export interface LibroCatalogoGlobal {
  libro: Libro;
  propietario: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleBooksService {
  private readonly apiUrl = 'http://localhost:3000/api';
  // URL base oficial de la API de Google Books
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  // Caché en memoria para optimizar tiempo de respuesta y evitar peticiones repetitivas
  private cacheBusqueda = new Map<string, ResultadoCatalogo>();
  // Caché en memoria del inventario por usuario
  private cacheInventario = new Map<string, Libro[]>();

  constructor(private http: HttpClient) {}

  public obtenerCatalogoGlobal(): Observable<LibroCatalogoGlobal[]> {
    return this.http.get<LibroBackend[]>(`${this.apiUrl}/libros`).pipe(
      map(libros => {
        if (!Array.isArray(libros)) {
          throw new Error('El backend devolvió un catálogo con formato inválido.');
        }
        return libros.map(libro => ({
          libro: this.convertirLibroBackend(libro),
          propietario: libro.propietario || ''
        }));
      })
    );
  }

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

  public obtenerInventarioUsuario(usuario: string): Observable<Libro[]> {
    const headers = new HttpHeaders({ 'x-usuario': usuario });
    return this.http.get<LibroBackend[]>(
      `${this.apiUrl}/libros/inventario/${encodeURIComponent(usuario)}`,
      { headers }
    ).pipe(
      map(libros => {
        if (!Array.isArray(libros)) {
          throw new Error('El backend devolvió un inventario con formato inválido.');
        }
        const inventario = libros.map(libro => this.convertirLibroBackend(libro));
        this.actualizarInventarioEnCache(usuario, inventario);
        return inventario;
      })
    );
  }

  public añadirLibroAInventario(libro: Libro, usuario: string): Observable<RespuestaAñadirLibro> {
    const headers = new HttpHeaders({ 'x-usuario': usuario });
    return this.http.post<{ libro: LibroBackend } | LibroBackend>(
      `${this.apiUrl}/libros`,
      {
        titulo: libro.titulo,
        autores: libro.autor ? [libro.autor] : [],
        disponible: libro.disponible,
        portadaUrl: libro.portadaUrl,
        descripcion: libro.descripcion,
        isbn: libro.isbn,
        categorias: [libro.categoria]
      },
      { headers }
    ).pipe(
      map(respuesta => {
        const libroPersistido = 'libro' in respuesta ? respuesta.libro : respuesta;
        if (!libroPersistido?.id) {
          throw new Error('El backend no confirmó el libro guardado.');
        }
        const guardado = this.convertirLibroBackend(libroPersistido);
        const inventarioActual = this.obtenerInventarioEnCache(usuario) || [];
        this.actualizarInventarioEnCache(usuario, [guardado, ...inventarioActual.filter(actual => actual.id !== guardado.id)]);
        return {
          libro: {
            id: guardado.id,
            titulo: guardado.titulo,
            autores: guardado.autor ? [guardado.autor] : [],
            disponible: guardado.disponible,
            portadaUrl: guardado.portadaUrl,
            descripcion: guardado.descripcion,
            isbn: guardado.isbn,
            categorias: [guardado.categoria]
          }
        };
      })
    );
  }

  private convertirLibroBackend(libro: LibroBackend): Libro {
    return new Libro(
      libro.id,
      libro.titulo,
      libro.autores?.join(', ') || libro.autor || 'Autor Desconocido',
      libro.disponible ?? true,
      libro.portadaUrl || '',
      libro.descripcion || '',
      libro.isbn || '',
      libro.categorias?.[0] || libro.categoria || 'General'
    );
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
