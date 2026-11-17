/* ==========================================================================
   ARCHIVO: intercambio.service.ts (FRONTEND: front/src/app/servicios/)
   Servicio: IntercambioService
   Función: Gestiona la comunicación HTTP con el Backend para la Gestión de Intercambios
            (Crear oferta, Modificar oferta, Chat de negociación en tiempo real).
   Arquitectura: Servicio inyectable en Angular (Diseño 3.pdf / C4 - Capa Servicios).
   ========================================================================== */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';

export interface MensajeChatDTO {
  id: string;
  remitente: string;
  texto: string;
  hora: string;
  fecha: string;
}

export interface RespuestaIntercambio {
  mensaje: string;
  oferta: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IntercambioService {
  private readonly apiUrl = 'http://localhost:3000/api/intercambios';

  constructor(private http: HttpClient) {}

  /*
    Obtiene el nombre de usuario activo desde la sesión
  */
  public obtenerUsuarioActual(): string {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null');
      return sesion?.usuario || sesion?.nombre || 'usuario_local';
    } catch {
      return 'usuario_local';
    }
  }

  /*
    Genera cabeceras con el usuario de sesión para autorización
  */
  private obtenerCabeceras(): HttpHeaders {
    const usuario = this.obtenerUsuarioActual();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-usuario': usuario
    });
  }

  /*
    HU: Enviar oferta de intercambio desde catálogo
  */
  public crearOferta(datos: {
    usuarioReceptor: string;
    librosOfrecidos: Libro[] | any[];
    librosSolicitados: Libro[] | any[];
    mensajeInicial?: string;
  }): Observable<RespuestaIntercambio> {
    const headers = this.obtenerCabeceras();
    const usuarioEmisor = this.obtenerUsuarioActual();

    const payload = {
      ...datos,
      usuarioEmisor
    };

    return this.http.post<RespuestaIntercambio>(this.apiUrl, payload, { headers }).pipe(
      catchError(error => {
        const errorMsg = error?.error?.error || error?.message || 'Error al crear la oferta de intercambio.';
        return of({ mensaje: errorMsg, oferta: null, error: errorMsg });
      })
    );
  }

  /*
    HU: Consultar oferta por ID
  */
  public obtenerOferta(idIntercambio: string): Observable<any> {
    const headers = this.obtenerCabeceras();
    return this.http.get<any>(`${this.apiUrl}/${idIntercambio}`, { headers }).pipe(
      catchError(() => {
        // Fallback local en caso de contingencia
        const guardada = localStorage.getItem(`oferta_${idIntercambio}`) || localStorage.getItem('oferta_activa');
        return of(guardada ? JSON.parse(guardada) : null);
      })
    );
  }

  /*
    HU: Modificar oferta de intercambio (Ajustar libros ofrecidos y solicitados)
  */
  public modificarOferta(
    idIntercambio: string,
    cambios: { librosOfrecidos: Libro[] | any[]; librosSolicitados: Libro[] | any[] }
  ): Observable<RespuestaIntercambio> {
    const headers = this.obtenerCabeceras();
    const usuarioSesion = this.obtenerUsuarioActual();

    const payload = {
      ...cambios,
      idIntercambio,
      usuarioSesion
    };

    return this.http.put<RespuestaIntercambio>(`${this.apiUrl}/${idIntercambio}`, payload, { headers }).pipe(
      map(res => {
        // Respaldo local para coherencia
        if (res?.oferta) {
          localStorage.setItem(`oferta_${idIntercambio}`, JSON.stringify(res.oferta));
          localStorage.setItem('oferta_activa', JSON.stringify(res.oferta));
        }
        return res;
      }),
      catchError(error => {
        const errorMsg = error?.error?.error || error?.message || 'Error al modificar la oferta.';
        return of({ mensaje: errorMsg, oferta: null, error: errorMsg });
      })
    );
  }

  /*
    HU: Chat de intercambio - Enviar mensaje
  */
  public enviarMensaje(idIntercambio: string, texto: string): Observable<any> {
    const headers = this.obtenerCabeceras();
    const remitente = this.obtenerUsuarioActual();

    return this.http.post<any>(`${this.apiUrl}/${idIntercambio}/mensajes`, { texto, remitente }, { headers }).pipe(
      catchError(error => {
        const errorMsg = error?.error?.error || error?.message || 'Error al enviar mensaje.';
        return of({ error: errorMsg });
      })
    );
  }

  /*
    HU: Chat de intercambio - Consultar mensajes
  */
  public obtenerMensajes(idIntercambio: string): Observable<MensajeChatDTO[]> {
    const headers = this.obtenerCabeceras();
    return this.http.get<MensajeChatDTO[]>(`${this.apiUrl}/${idIntercambio}/mensajes`, { headers }).pipe(
      catchError(() => of([]))
    );
  }

  /*
    HU: Cancelar intercambio activo
  */
  public cancelarOferta(idIntercambio: string): Observable<any> {
    const headers = this.obtenerCabeceras();
    return this.http.delete<any>(`${this.apiUrl}/${idIntercambio}`, { headers }).pipe(
      map(res => {
        localStorage.removeItem('oferta_activa');
        localStorage.removeItem('oferta_activa_id');
        localStorage.removeItem(`oferta_${idIntercambio}`);
        sessionStorage.removeItem('libroSolicitado');
        return res;
      }),
      catchError(error => of({ error: error?.error?.error || error?.message }))
    );
  }

  /*
    Consultar los intercambios activos del usuario actual
  */
  public obtenerMisIntercambios(): Observable<any[]> {
    const headers = this.obtenerCabeceras();
    const usuario = this.obtenerUsuarioActual();
    return this.http.get<any[]>(`${this.apiUrl}/usuario/${encodeURIComponent(usuario)}`, { headers }).pipe(
      catchError(() => of([]))
    );
  }
}
