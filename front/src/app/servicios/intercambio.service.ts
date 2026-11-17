/* ==========================================================================
   ARCHIVO: intercambio.service.ts (FRONTEND: front/src/app/servicios/)
   Servicio: IntercambioService
   Función: Gestiona la comunicación HTTP con el Backend para la Gestión de Intercambios
            (Crear oferta, Modificar oferta, Confirmar, Chat de negociación en tiempo real,
            y eliminación de solicitudes cerradas).
   Arquitectura: Servicio inyectable en Angular (Diseño 3.pdf / C4 - Capa Servicios).
   ========================================================================== */

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

interface RespuestaOferta {
  oferta: OfertaIntercambio;
}

@Injectable({
  providedIn: 'root'
})
export class IntercambioService {
  private readonly apiUrl = 'http://localhost:3000/api/intercambios';

  constructor(private readonly http: HttpClient) {}

  /*
    Obtiene el nombre de usuario activo desde la sesión
  */
  public obtenerUsuarioActual(): string {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioLogueado') || 'null');
      return sesion?.usuario || sesion?.nombre || '';
    } catch {
      return '';
    }
  }

  /*
    Genera cabeceras con el usuario de sesión para autorización
  */
  public obtenerCabeceras(): HttpHeaders {
    const usuario = this.obtenerUsuarioActual();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-usuario': usuario
    });
  }

  private headersUsuario(usuario: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-usuario': usuario
    });
  }

  /*
    HU: Consultar intercambios por participante (método de suite de pruebas)
  */
  public obtenerPorParticipante(usuario: string): Observable<OfertaIntercambio[]> {
    return this.http.get<OfertaIntercambio[]>(this.apiUrl, {
      headers: this.headersUsuario(usuario)
    });
  }

  /*
    HU: Crear oferta (método con modelo para suite de pruebas)
  */
  public crear(oferta: OfertaIntercambio, usuario: string): Observable<OfertaIntercambio> {
    return this.http.post<RespuestaOferta>(
      this.apiUrl,
      {
        idIntercambio: oferta.idIntercambio,
        usuarioReceptor: oferta.usuarioReceptor,
        librosOfrecidos: oferta.librosOfrecidos,
        librosSolicitados: oferta.librosSolicitados
      },
      { headers: this.headersUsuario(usuario) }
    ).pipe(map(respuesta => respuesta.oferta));
  }

  /*
    HU: Modificar oferta (método con modelo para suite de pruebas)
  */
  public modificar(oferta: OfertaIntercambio, usuario: string): Observable<OfertaIntercambio> {
    return this.http.put<RespuestaOferta>(
      `${this.apiUrl}/${encodeURIComponent(oferta.idIntercambio)}`,
      {
        librosOfrecidos: oferta.librosOfrecidos,
        librosSolicitados: oferta.librosSolicitados
      },
      { headers: this.headersUsuario(usuario) }
    ).pipe(map(respuesta => respuesta.oferta));
  }

  /*
    HU: Confirmar oferta
  */
  public confirmar(idIntercambio: string, usuario: string): Observable<OfertaIntercambio> {
    return this.http.post<RespuestaOferta>(
      `${this.apiUrl}/${encodeURIComponent(idIntercambio)}/confirmar`,
      {},
      { headers: this.headersUsuario(usuario) }
    ).pipe(map(respuesta => respuesta.oferta));
  }

  /*
    HU: Cancelar intercambio
  */
  public cancelar(idIntercambio: string, usuario: string): Observable<OfertaIntercambio> {
    return this.http.post<RespuestaOferta>(
      `${this.apiUrl}/${encodeURIComponent(idIntercambio)}/cancelar`,
      {},
      { headers: this.headersUsuario(usuario) }
    ).pipe(map(respuesta => respuesta.oferta));
  }

  /*
    HU: Eliminar de lista un intercambio finalizado o cancelado
  */
  public eliminarDeLista(idIntercambio: string, usuario: string): Observable<{
    mensaje: string;
    idIntercambio: string;
    oculto: boolean;
  }> {
    return this.http.delete<{
      mensaje: string;
      idIntercambio: string;
      oculto: boolean;
    }>(
      `${this.apiUrl}/${encodeURIComponent(idIntercambio)}`,
      { headers: this.headersUsuario(usuario) }
    );
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
    return this.http.post<any>(`${this.apiUrl}/${idIntercambio}/cancelar`, {}, { headers }).pipe(
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
