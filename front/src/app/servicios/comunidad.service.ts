import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface MensajeComunidad {
  emisor: string;
  texto: string;
  fecha: string;
}

export interface Comunidad {
  id: string;
  nombre: string;
  descripcion: string;
  genero: string;
  tipo: 'publico' | 'privado' | string;
  creador: string;
  administradores: string[];
  miembros: string[];
  maxMiembros: number;
  fechaCreacion?: string;
  mensajes?: MensajeComunidad[];
}

@Injectable({
  providedIn: 'root'
})
export class ComunidadService {
  private readonly apiUrl = 'http://localhost:3000/api/comunidades';
  private readonly storageKeyGlobal = 'comunidadesGlobales';
  private readonly storageKeyActiva = 'comunidadActiva';

  constructor(private http: HttpClient) {}

  // Obtiene el usuario actual logueado
  obtenerUsuarioActual(): string {
    try {
      const sesion = localStorage.getItem('usuarioLogueado');
      if (sesion) {
        const u = JSON.parse(sesion);
        return u.usuario || '';
      }
    } catch {}
    return '';
  }

  // OPTIMIZACIÓN 1: Obtención instantánea desde memoria local/caché (0 ms de espera)
  obtenerComunidadesInstantaneas(): Comunidad[] {
    return this.obtenerComunidadesLocales();
  }

  // OPTIMIZACIÓN 2: Obtención instantánea de comunidades del usuario (0 ms)
  obtenerMisComunidadesInstantaneas(usuario: string): Comunidad[] {
    const todas = this.obtenerComunidadesLocales();
    const u = (usuario || '').toLowerCase().trim();
    const creadas = todas.filter(c => c.creador && c.creador.toLowerCase() === u);
    // Si no ha creado ninguna pero es miembro de alguna, se muestran también
    if (creadas.length === 0) {
      return todas.filter(c => Array.isArray(c.miembros) && c.miembros.some(m => m.toLowerCase() === u));
    }
    return creadas;
  }

  // Lista todas las comunidades (con timeout estricto de 1.2s para nunca congelar la vista)
  obtenerComunidades(): Observable<Comunidad[]> {
    return this.http.get<Comunidad[]>(this.apiUrl).pipe(
      timeout(1200), // Si el backend no responde en 1.2 segundos, usa la caché de inmediato
      map(comunidades => {
        if (Array.isArray(comunidades) && comunidades.length > 0) {
          localStorage.setItem(this.storageKeyGlobal, JSON.stringify(comunidades));
          return comunidades;
        }
        return this.obtenerComunidadesLocales();
      }),
      catchError(() => of(this.obtenerComunidadesLocales()))
    );
  }

  // Lista comunidades creadas por el usuario
  obtenerMisComunidades(usuario: string): Observable<Comunidad[]> {
    return this.obtenerComunidades().pipe(
      map(lista => {
        const u = (usuario || '').toLowerCase().trim();
        const creadas = lista.filter(c => c.creador && c.creador.toLowerCase() === u);
        if (creadas.length === 0) {
          return lista.filter(c => Array.isArray(c.miembros) && c.miembros.some(m => m.toLowerCase() === u));
        }
        return creadas;
      })
    );
  }

  // Obtener una comunidad por ID
  obtenerPorId(id: string): Observable<Comunidad | null> {
    return this.obtenerComunidades().pipe(
      map(lista => lista.find(c => c.id === id) || null)
    );
  }

  // Crear nueva comunidad
  crearComunidad(datos: Partial<Comunidad>): Observable<{ exito: boolean; mensaje: string; comunidad?: Comunidad }> {
    const usuario = this.obtenerUsuarioActual();
    const payload = {
      ...datos,
      creador: usuario,
      administradores: [usuario],
      miembros: [usuario],
      maxMiembros: 20,
      mensajes: []
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(res => {
        const comunidadCreada = res.comunidad || payload;
        this.guardarComunidadLocal(comunidadCreada);
        this.establecerComunidadActiva(comunidadCreada);
        return { exito: true, mensaje: 'Comunidad creada con éxito', comunidad: comunidadCreada };
      }),
      catchError((err) => {
        const errorMsg = err.error?.error || 'Error al crear comunidad';
        // Fallback local
        if (errorMsg.includes('ya existe')) {
          return of({ exito: false, mensaje: 'Este nombre ya existe, por favor introduzca otro' });
        }
        const nuevaLocal: Comunidad = {
          id: `com_${Date.now()}`,
          nombre: datos.nombre || '',
          descripcion: datos.descripcion || '',
          genero: datos.genero || 'Aventura',
          tipo: datos.tipo || 'publico',
          creador: usuario,
          administradores: [usuario],
          miembros: [usuario],
          maxMiembros: 20,
          mensajes: []
        };
        this.guardarComunidadLocal(nuevaLocal);
        this.establecerComunidadActiva(nuevaLocal);
        return of({ exito: true, mensaje: 'Comunidad creada con éxito', comunidad: nuevaLocal });
      })
    );
  }

  // Unirse a una comunidad
  unirseAComunidad(idComunidad: string, usuario: string): Observable<{ exito: boolean; mensaje: string; comunidad?: Comunidad }> {
    return this.http.post<any>(`${this.apiUrl}/${idComunidad}/unir`, { usuario }).pipe(
      map(res => {
        if (res.comunidad) {
          this.actualizarComunidadLocal(res.comunidad);
          this.establecerComunidadActiva(res.comunidad);
        }
        return { exito: true, mensaje: res.mensaje, comunidad: res.comunidad };
      }),
      catchError(err => {
        const errorServidor = err.error?.error;
        if (errorServidor === 'Comunidad llena') {
          return of({ exito: false, mensaje: 'Comunidad llena' });
        }

        // Lógica de fallback local
        const lista = this.obtenerComunidadesLocales();
        const com = lista.find(c => c.id === idComunidad);
        if (!com) return of({ exito: false, mensaje: 'Comunidad no encontrada' });

        if (com.miembros.length >= 20) {
          return of({ exito: false, mensaje: 'Comunidad llena' });
        }

        if (!com.miembros.includes(usuario)) {
          com.miembros.push(usuario);
          this.actualizarComunidadLocal(com);
          this.establecerComunidadActiva(com);
        }
        return of({ exito: true, mensaje: 'Te has unido exitosamente', comunidad: com });
      })
    );
  }

  // Enviar mensaje al chat
  enviarMensaje(idComunidad: string, emisor: string, texto: string): Observable<MensajeComunidad | null> {
    return this.http.post<any>(`${this.apiUrl}/${idComunidad}/mensajes`, { emisor, texto }).pipe(
      map(res => {
        const mensaje: MensajeComunidad = res.data || { emisor, texto, fecha: new Date().toISOString() };
        this.agregarMensajeLocal(idComunidad, mensaje);
        return mensaje;
      }),
      catchError(() => {
        const msg: MensajeComunidad = { emisor, texto, fecha: new Date().toISOString() };
        this.agregarMensajeLocal(idComunidad, msg);
        return of(msg);
      })
    );
  }

  // Manejo de comunidad activa en navegación
  establecerComunidadActiva(comunidad: Comunidad): void {
    localStorage.setItem(this.storageKeyActiva, JSON.stringify(comunidad));
  }

  obtenerComunidadActiva(): Comunidad | null {
    try {
      const data = localStorage.getItem(this.storageKeyActiva);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /* ---------------- MÉTODOS LOCALES AUXILIARES ---------------- */
  private obtenerComunidadesLocales(): Comunidad[] {
    const raw = localStorage.getItem(this.storageKeyGlobal);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return [];
  }

  private guardarComunidadLocal(comunidad: Comunidad): void {
    const lista = this.obtenerComunidadesLocales();
    lista.push(comunidad);
    localStorage.setItem(this.storageKeyGlobal, JSON.stringify(lista));
  }

  private actualizarComunidadLocal(comunidad: Comunidad): void {
    const lista = this.obtenerComunidadesLocales();
    const idx = lista.findIndex(c => c.id === comunidad.id);
    if (idx >= 0) {
      lista[idx] = comunidad;
    } else {
      lista.push(comunidad);
    }
    localStorage.setItem(this.storageKeyGlobal, JSON.stringify(lista));
  }

  private agregarMensajeLocal(idComunidad: string, mensaje: MensajeComunidad): void {
    const lista = this.obtenerComunidadesLocales();
    const com = lista.find(c => c.id === idComunidad);
    if (com) {
      if (!Array.isArray(com.mensajes)) com.mensajes = [];
      com.mensajes.push(mensaje);
      localStorage.setItem(this.storageKeyGlobal, JSON.stringify(lista));
    }
    const activa = this.obtenerComunidadActiva();
    if (activa && activa.id === idComunidad) {
      if (!Array.isArray(activa.mensajes)) activa.mensajes = [];
      activa.mensajes.push(mensaje);
      localStorage.setItem(this.storageKeyActiva, JSON.stringify(activa));
    }
  }
}
