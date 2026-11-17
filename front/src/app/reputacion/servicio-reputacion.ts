import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError, timeout } from 'rxjs';
import { OfertaIntercambio } from '../modelos/intercambio.model';
import { Calificacion, Intercambio } from './modelo-reputacion';
import type {
  CalificacionPlana, FiltroResenas, ResultadoOperacion
} from './modelo-reputacion';

@Injectable({ providedIn: 'root' })
export class ServicioReputacion {
  private readonly API_CALIFICACIONES = 'http://localhost:3000/api/calificaciones';
  private readonly API_INTERCAMBIOS = 'http://localhost:3000/api/intercambios';
  private readonly CLAVE_SESION = 'usuarioLogueado';

  constructor(private readonly http: HttpClient) {}

  public obtenerUsuarioActual(): string | null {
    try {
      const crudo = localStorage.getItem(this.CLAVE_SESION);
      if (!crudo) return null;
      const sesion = JSON.parse(crudo) as { usuario?: string };
      return sesion.usuario ?? null;
    } catch {
      return null;
    }
  }

  public obtenerIntercambiosFinalizados(usuario: string): Observable<Intercambio[]> {
    const headers = new HttpHeaders({ 'x-usuario': usuario });
    const params = new HttpParams().set('incluirOcultas', 'true');
    return this.http.get<OfertaIntercambio[]>(this.API_INTERCAMBIOS, { headers, params }).pipe(
      map(ofertas => {
        if (!Array.isArray(ofertas)) {
          throw new Error('La respuesta de intercambios no tiene un formato válido.');
        }
        return ofertas
          .filter(oferta =>
            oferta.estado === 'Finalizado' &&
            [oferta.usuarioEmisor, oferta.usuarioReceptor]
              .some(participante => participante.toLowerCase() === usuario.toLowerCase())
          )
          .map(oferta => new Intercambio(
            oferta.idIntercambio,
            this.titulosLibros(oferta.librosOfrecidos),
            this.titulosLibros(oferta.librosSolicitados),
            oferta.usuarioEmisor,
            oferta.usuarioReceptor,
            'Finalizado',
            oferta.fechaCreacion || oferta.fechaModificacion
          ));
      })
    );
  }

  public yaFueCalificado(
    evaluador: string,
    idIntercambio: string,
    tipo: 'lector' | 'intercambio'
  ): Observable<boolean> {
    return this.consultarCalificaciones({
      evaluador,
      idIntercambio,
      filtro: tipo
    }).pipe(map(calificaciones => calificaciones.length > 0));
  }

  public registrarCalificacion(calificacion: Calificacion): Observable<ResultadoOperacion> {
    const validacion = calificacion.validar();
    if (!validacion.exito) return of(validacion);

    const usuarioSesion = this.obtenerUsuarioActual();
    if (!usuarioSesion || usuarioSesion !== calificacion.evaluador) {
      return of({ exito: false, mensaje: 'Debe iniciar sesion con la cuenta que realiza la calificacion.' });
    }

    return this.obtenerIntercambiosFinalizados(calificacion.evaluador).pipe(
      switchMap(intercambios => {
        const intercambio = intercambios.find(item => item.id === calificacion.idIntercambio);
        if (!intercambio) {
          return of({ exito: false, mensaje: 'El intercambio seleccionado no existe o no ha finalizado.' });
        }
        if (intercambio.contraparteDe(calificacion.evaluador) !== calificacion.evaluado) {
          return of({ exito: false, mensaje: 'El lector evaluado no corresponde a este intercambio.' });
        }

        const headers = new HttpHeaders({ 'x-usuario': usuarioSesion });
        return this.http.post<{ mensaje: string }>(this.API_CALIFICACIONES, calificacion, { headers }).pipe(
          timeout(10000),
          map(respuesta => ({ exito: true, mensaje: respuesta.mensaje || 'Calificacion registrada con exito.' })),
          catchError(() => of({
            exito: false,
            mensaje: 'No se pudo guardar la calificación. Intente nuevamente más tarde.'
          }))
        );
      }),
      catchError(() => of({
        exito: false,
        mensaje: 'No se pudo verificar el intercambio finalizado. Intente nuevamente más tarde.'
      }))
    );
  }

  public generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  public obtenerResenas(lector: string, filtro: FiltroResenas = 'todas'): Observable<Calificacion[]> {
    return this.consultarCalificaciones({ evaluado: lector, filtro });
  }

  public obtenerResenasEnviadas(
    evaluador: string,
    filtro: FiltroResenas = 'todas'
  ): Observable<Calificacion[]> {
    return this.consultarCalificaciones({ evaluador, filtro });
  }

  public calcularPromedio(lector: string): Observable<number | null> {
    return this.obtenerResenas(lector, 'lector').pipe(
      map(resenas => {
        if (resenas.length === 0) return null;
        const promedio = resenas.reduce((suma, resena) => suma + resena.puntuacion, 0) / resenas.length;
        return Math.round(promedio * 10) / 10;
      })
    );
  }

  // Calcula el promedio de reputacion de CUALQUIER usuario (sin restriccion de sesion propia).
  // Devuelve 0 si no tiene resenas. Usado en la vista de perfil para mostrar la reputacion real.
  public calcularPromedioPublico(lector: string): Observable<number> {
    const usuarioSesion = this.obtenerUsuarioActual();
    const headers = usuarioSesion
      ? new HttpHeaders({ 'x-usuario': usuarioSesion })
      : new HttpHeaders();
    const params = new HttpParams().set('evaluado', lector).set('filtro', 'lector');

    return this.http.get<any[]>(this.API_CALIFICACIONES, { headers, params }).pipe(
      timeout(8000),
      map(datos => {
        if (!Array.isArray(datos) || datos.length === 0) return 0;
        const notas = datos
          .filter((c: any) => c.tipo === 'lector')
          .map((c: any) => Number(c.puntuacion))
          .filter((n: number) => !isNaN(n));
        if (notas.length === 0) return 0;
        const promedio = notas.reduce((acc: number, n: number) => acc + n, 0) / notas.length;
        return Math.round(promedio * 10) / 10;
      }),
      catchError(() => of(0))
    );
  }

  private consultarCalificaciones(
    consulta: { evaluado?: string; evaluador?: string; idIntercambio?: string; filtro?: FiltroResenas }
  ): Observable<Calificacion[]> {
    const usuarioSesion = this.obtenerUsuarioActual();
    const usuarioConsultado = consulta.evaluado || consulta.evaluador;
    if (!usuarioSesion || usuarioConsultado !== usuarioSesion) {
      return throwError(() => new Error('Solo puede consultar sus propias resenas.'));
    }

    let params = new HttpParams();
    Object.entries(consulta).forEach(([clave, valor]) => {
      if (valor) params = params.set(clave, valor);
    });

    const headers = new HttpHeaders({ 'x-usuario': usuarioSesion });
    return this.http.get<CalificacionPlana[]>(this.API_CALIFICACIONES, { headers, params }).pipe(
      timeout(8000),
      map(datos => {
        if (!Array.isArray(datos)) throw new Error('La respuesta de resenas no tiene un formato valido.');
        return datos
          .map(plano => Calificacion.desdeJSON(plano))
          .sort((a, b) => b.comentario.fecha.localeCompare(a.comentario.fecha));
      })
    );
  }

  private titulosLibros(libros: OfertaIntercambio['librosOfrecidos']): string {
    return libros.map(libro => libro.titulo).filter(Boolean).join(', ') || 'Libro sin título';
  }

}