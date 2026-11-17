import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OfertaIntercambio } from '../modelos/intercambio.model';

interface RespuestaOferta {
  oferta: OfertaIntercambio;
}

@Injectable({
  providedIn: 'root'
})
export class IntercambioService {
  private readonly apiUrl = 'http://localhost:3000/api/intercambios';

  constructor(private readonly http: HttpClient) {}

  obtenerPorParticipante(usuario: string): Observable<OfertaIntercambio[]> {
    return this.http.get<OfertaIntercambio[]>(this.apiUrl, {
      headers: this.headersUsuario(usuario)
    });
  }

  crear(oferta: OfertaIntercambio, usuario: string): Observable<OfertaIntercambio> {
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

  modificar(oferta: OfertaIntercambio, usuario: string): Observable<OfertaIntercambio> {
    return this.http.put<RespuestaOferta>(
      `${this.apiUrl}/${encodeURIComponent(oferta.idIntercambio)}`,
      {
        librosOfrecidos: oferta.librosOfrecidos,
        librosSolicitados: oferta.librosSolicitados
      },
      { headers: this.headersUsuario(usuario) }
    ).pipe(map(respuesta => respuesta.oferta));
  }

  confirmar(idIntercambio: string, usuario: string): Observable<OfertaIntercambio> {
    return this.http.post<RespuestaOferta>(
      `${this.apiUrl}/${encodeURIComponent(idIntercambio)}/confirmar`,
      {},
      { headers: this.headersUsuario(usuario) }
    ).pipe(map(respuesta => respuesta.oferta));
  }

  cancelar(idIntercambio: string, usuario: string): Observable<OfertaIntercambio> {
    return this.http.post<RespuestaOferta>(
      `${this.apiUrl}/${encodeURIComponent(idIntercambio)}/cancelar`,
      {},
      { headers: this.headersUsuario(usuario) }
    ).pipe(map(respuesta => respuesta.oferta));
  }

  eliminarDeLista(idIntercambio: string, usuario: string): Observable<{
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

  private headersUsuario(usuario: string): HttpHeaders {
    return new HttpHeaders({ 'x-usuario': usuario });
  }
}
