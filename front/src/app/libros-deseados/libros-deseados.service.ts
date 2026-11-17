import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface LibroDeseado {
  id: string;
  titulo: string;
  autor: string;
  anio: number | null;
}

@Injectable({ providedIn: 'root' })
export class LibrosDeseadosService {
  private readonly apiUrl = 'http://localhost:3000/api/libros-deseados';

  constructor(private readonly http: HttpClient) {}

  obtener(usuario: string): Observable<LibroDeseado[]> {
    return this.http.get<LibroDeseado[]>(this.apiUrl, {
      headers: this.crearHeaders(usuario)
    });
  }

  agregar(
    usuario: string,
    libro: Pick<LibroDeseado, 'titulo' | 'autor' | 'anio'>
  ): Observable<LibroDeseado> {
    return this.http.post<LibroDeseado>(this.apiUrl, libro, {
      headers: this.crearHeaders(usuario)
    });
  }

  eliminar(usuario: string, id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${encodeURIComponent(id)}`, {
      headers: this.crearHeaders(usuario)
    });
  }

  private crearHeaders(usuario: string): HttpHeaders {
    return new HttpHeaders({ 'x-usuario': usuario });
  }
}
