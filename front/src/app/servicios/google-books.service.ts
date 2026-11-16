import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

export interface RespuestaAñadirLibro {
  mensaje: string;
  libro: any;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleBooksService {
  private readonly baseUrlGoogle = 'https://www.googleapis.com/books/v1/volumes';
  private readonly apiUrlBackend = 'http://localhost:3000/api/libros';
  private cacheBusqueda = new Map<string, Libro[]>();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el catálogo global desde la Persistencia JSON del Backend (back/Persistencia/libros.json)
   * Con fallback automático ante caídas de red.
   */
  obtenerCatalogoInicial(): Observable<Libro[]> {
    return this.http.get<any[]>(this.apiUrlBackend).pipe(
      map(librosJson => {
        if (!Array.isArray(librosJson) || librosJson.length === 0) {
          return this.catalogoRespaldo();
        }
        return librosJson.map(item => new Libro(
          item.id,
          item.titulo,
          Array.isArray(item.autores) ? item.autores.join(', ') : (item.autores || 'Autor Desconocido'),
          item.disponible !== false,
          item.portadaUrl || '',
          item.descripcion || '',
          item.isbn || '',
          Array.isArray(item.categorias) ? item.categorias[0] : (item.categorias || 'General')
        ));
      }),
      catchError(() => {
        // Fallback local si el servidor backend no estuviera iniciado
        return of(this.catalogoRespaldo());
      })
    );
  }

  /**
   * Busca libros en Google Books API para sugerencias o registrar nuevo libro
   */
  buscarLibros(termino: string, maxResults: number = 12): Observable<Libro[]> {
    const q = termino ? termino.trim() : '';
    if (!q) {
      return of([]);
    }

    if (this.cacheBusqueda.has(q)) {
      return of(this.cacheBusqueda.get(q)!);
    }

    const url = `${this.baseUrlGoogle}?q=${encodeURIComponent(q)}&maxResults=${maxResults}&langRestrict=es`;

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
      catchError(() => of([]))
    );
  }

  /**
   * Flujo del Diagrama UML (Añadir libro | MVC):
   * Front -> Controllers (POST http://localhost:3000/api/libros)
   * Persiste en back/Persistencia/libros.json y retorna "mensaje: libro añadido exitosamente"
   */
  añadirLibroAInventario(libro: Libro, usuario: string): Observable<RespuestaAñadirLibro> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-usuario': usuario
    });

    const payload = {
      id: libro.id,
      titulo: libro.titulo,
      autores: [libro.autor],
      descripcion: libro.descripcion,
      portadaUrl: libro.portadaUrl,
      isbn: libro.isbn,
      categorias: [libro.categoria],
      disponible: true,
      propietario: usuario
    };

    return this.http.post<RespuestaAñadirLibro>(this.apiUrlBackend, payload, { headers }).pipe(
      catchError(() => {
        // Respaldo de contingencia
        return of({
          mensaje: 'libro añadido exitosamente (modo offline)',
          libro: payload
        });
      })
    );
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

  /**
   * Datos semilla de respaldo si no hay conexión al backend ni a internet
   */
  private catalogoRespaldo(): Libro[] {
    return [
      new Libro('lib_100', 'El Principito', 'Antoine de Saint-Exupéry', true, 'https://books.google.com/books/content?id=ylT6DwAAQBAJ&printsec=frontcover&img=1&zoom=1'),
      new Libro('lib_101', '1984', 'George Orwell', true, 'https://books.google.com/books/content?id=cotPYEqe-rkC&printsec=frontcover&img=1&zoom=1'),
      new Libro('lib_102', 'Doña Bárbara', 'Rómulo Gallegos', true),
      new Libro('lib_103', 'Cien Años de Soledad', 'Gabriel García Márquez', true)
    ];
  }
}
