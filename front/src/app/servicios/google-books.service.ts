import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Libro } from '../modelos/intercambio.model';

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
  };
}

export interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBookItem[];
}

@Injectable({
  providedIn: 'root'
})
export class GoogleBooksService {
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  private cacheBusqueda = new Map<string, Libro[]>();

  constructor(private http: HttpClient) {}

  /**
   * Busca libros en Google Books por término (título, autor, tema).
   * Mapea el resultado a instancias de la clase Libro.
   */
  buscarLibros(termino: string, maxResults: number = 12): Observable<Libro[]> {
    const q = termino ? termino.trim() : '';
    if (!q) {
      return of([]);
    }

    if (this.cacheBusqueda.has(q)) {
      return of(this.cacheBusqueda.get(q)!);
    }

    const url = `${this.baseUrl}?q=${encodeURIComponent(q)}&maxResults=${maxResults}&langRestrict=es`;

    return this.http.get<GoogleBooksResponse>(url).pipe(
      map(res => {
        if (!res.items || res.items.length === 0) {
          return [];
        }
        const libros = res.items
          .filter(item => item.volumeInfo && item.volumeInfo.title)
          .map(item => this.mapearALibro(item));

        this.cacheBusqueda.set(q, libros);
        return libros;
      }),
      catchError(error => {
        console.error('[GoogleBooksService] Error al consultar la API:', error);
        return of([]);
      })
    );
  }

  /**
   * Catálogo inicial recomendado para la comunidad (libros populares/clásicos)
   */
  obtenerCatalogoInicial(): Observable<Libro[]> {
    return this.buscarLibros('novela clasicos ficcion', 12);
  }

  /**
   * Mapea un volumen crudo de Google Books a la clase Libro del dominio
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
      info.description || 'Sin descripción disponible.',
      isbnObj ? isbnObj.identifier : '',
      info.categories?.[0] || 'General'
    );
  }
}
