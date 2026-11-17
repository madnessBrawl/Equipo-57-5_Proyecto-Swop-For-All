import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

export class PerfilLectorDominio {
  constructor(
    public usuario: string,
    public nombre: string,
    public apellido: string,
    public correo: string,
    public telefono: string = '',
    public estadoVenezuela: string = 'Distrito Capital',
    public genero: string = 'Prefiero no decir',
    public generosFavoritos: string = '',
    public biografia: string = '',
    public reputacion: number = 0,
    public clave: string = ''
  ) {}

  validar(): string | null {
    if (!this.nombre.trim()) return 'El nombre no puede estar vacio.';
    if (!this.apellido.trim()) return 'El apellido no puede estar vacio.';
    if (!this.correo.trim()) return 'El correo electronico es obligatorio.';

    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!patronCorreo.test(this.correo.trim())) return 'El correo no tiene un formato valido.';

    if (this.telefono.trim()) {
      const telLimpio = this.telefono.replace(/[\s-]/g, '');
      const patronTel = /^0(412|414|424|416|426|212)\d{7}$/;
      if (!patronTel.test(telLimpio)) return 'El telefono debe ser un numero valido de Venezuela (ej: 04141234567).';
    }

    if (this.biografia && this.biografia.length > 400) return 'La biografia no puede exceder los 400 caracteres.';

    return null;
  }
}

@Component({
  selector: 'app-modificar-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modificar-perfil.html',
  styleUrls: ['./estilos-modificar-perfil.css']
})
export class ModificarPerfilComponent implements OnInit {
  perfilOriginal!: PerfilLectorDominio;

  datosFormulario = {
    usuario: '',
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    estadoVenezuela: 'Distrito Capital',
    genero: 'Prefiero no decir',
    generosFavoritos: '',
    biografia: ''
  };

  mensajeNotificacion: string = '';
  tipoNotificacion: 'exito' | 'error' = 'exito';
  guardando: boolean = false;

  // Lista de generos favoritos seleccionados (maximo 3)
  generosSeleccionados: string[] = [];

  readonly opcionesGeneros: string[] = [
    'Terror', 'Drama', 'Comedia', 'Misterio', 'Horror',
    'Fantasia', 'Ciencia-ficcion', 'Accion', 'Romance',
    'Aventura', 'Suspenso', 'Juvenil', 'Paranormal'
  ];

  private readonly API_PERFIL = 'http://localhost:3000/api/perfil';
  private readonly API_CALIFICACIONES = 'http://localhost:3000/api/calificaciones';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarPerfilDesdeSesion();
  }

  private cargarPerfilDesdeSesion(): void {
    const sesion = localStorage.getItem('usuarioLogueado');

    if (!sesion) {
      this.router.navigate(['/']);
      return;
    }

    try {
      const u = JSON.parse(sesion);

      if (!u.usuario) {
        this.router.navigate(['/']);
        return;
      }

      // Soporta campos tanto en singular (nombre/apellido) como plural (nombres/apellidos)
      const nombre = u.nombre || u.nombres || '';
      const apellido = u.apellido || u.apellidos || '';

      this.perfilOriginal = new PerfilLectorDominio(
        u.usuario,
        nombre,
        apellido,
        u.correo || '',
        u.telefono || '',
        u.estadoVenezuela || 'Distrito Capital',
        u.genero || 'Prefiero no decir',
        u.generosFavoritos || '',
        u.biografia || '',
        0,
        u.clave || ''
      );

      this.datosFormulario = {
        usuario: this.perfilOriginal.usuario,
        nombre: this.perfilOriginal.nombre,
        apellido: this.perfilOriginal.apellido,
        correo: this.perfilOriginal.correo,
        telefono: this.perfilOriginal.telefono,
        estadoVenezuela: this.perfilOriginal.estadoVenezuela,
        genero: this.perfilOriginal.genero,
        generosFavoritos: this.perfilOriginal.generosFavoritos,
        biografia: this.perfilOriginal.biografia
      };

      this.cargarGenerosSeleccionados(this.perfilOriginal.generosFavoritos);

      this.cargarReputacion(u.usuario);

    } catch (e) {
      this.router.navigate(['/']);
    }
  }

  private cargarReputacion(usuario: string): void {
    const params = new HttpParams().set('evaluado', usuario).set('filtro', 'lector');
    const headers = new HttpHeaders({ 'x-usuario': usuario });

    this.http.get<any[]>(this.API_CALIFICACIONES, { headers, params }).pipe(
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
    ).subscribe(promedio => {
      if (this.perfilOriginal) {
        this.perfilOriginal.reputacion = promedio;
      }
    });
  }

  toggleGenero(genero: string): void {
    const idx = this.generosSeleccionados.indexOf(genero);
    if (idx >= 0) {
      this.generosSeleccionados.splice(idx, 1);
    } else {
      if (this.generosSeleccionados.length < 3) {
        this.generosSeleccionados.push(genero);
      }
    }
    this.datosFormulario.generosFavoritos = this.generosSeleccionados.join(', ');
  }

  estaSeleccionado(genero: string): boolean {
    return this.generosSeleccionados.includes(genero);
  }

  private cargarGenerosSeleccionados(str: string): void {
    if (!str) {
      this.generosSeleccionados = [];
      return;
    }
    const partes = str.split(',').map(s => s.trim().toLowerCase());
    this.generosSeleccionados = this.opcionesGeneros.filter(opcion => {
      const normalizado = opcion.toLowerCase();
      const sinTilde = normalizado.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return partes.some(p => {
        const pSinTilde = p.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return p === normalizado || pSinTilde === sinTilde;
      });
    }).slice(0, 3);
    this.datosFormulario.generosFavoritos = this.generosSeleccionados.join(', ');
  }

  guardarCambios(): void {
    this.datosFormulario.generosFavoritos = this.generosSeleccionados.join(', ');
    const f = this.datosFormulario;

    const perfilModificado = new PerfilLectorDominio(
      this.perfilOriginal.usuario,
      f.nombre,
      f.apellido,
      f.correo,
      f.telefono,
      f.estadoVenezuela,
      f.genero,
      f.generosFavoritos,
      f.biografia,
      this.perfilOriginal.reputacion,
      this.perfilOriginal.clave
    );

    // Validacion en el modelo
    const errorValidacion = perfilModificado.validar();
    if (errorValidacion) {
      this.mostrarMensaje(errorValidacion, 'error');
      return;
    }

    const confirmacion = confirm('Esta seguro de que desea guardar los cambios en su perfil?');
    if (!confirmacion) return;

    this.guardando = true;

    // Payload para el backend (usa los campos que el backend espera)
    const payload = {
      nombre: f.nombre,
      nombres: f.nombre,
      apellido: f.apellido,
      apellidos: f.apellido,
      correo: f.correo,
      telefono: f.telefono,
      estadoVenezuela: f.estadoVenezuela,
      genero: f.genero,
      generosFavoritos: f.generosFavoritos,
      biografia: f.biografia
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-usuario': this.perfilOriginal.usuario
    });

    // Llama al backend para persistir los cambios en usuarios.json
    this.http.put<any>(this.API_PERFIL, payload, { headers }).pipe(
      catchError(err => {
        // Si el backend falla, se guarda solo en localStorage como contingencia
        console.warn('Backend no disponible, guardando solo en localStorage:', err.message);
        return of({ contingencia: true });
      })
    ).subscribe(res => {
      this.guardando = false;

      // Actualiza el perfil en memoria y en localStorage
      this.perfilOriginal = perfilModificado;

      // Construye el objeto de sesion actualizado conservando campos originales
      const sesionActual = JSON.parse(localStorage.getItem('usuarioLogueado') || '{}');
      const sesionActualizada = {
        ...sesionActual,
        nombre: f.nombre,
        nombres: f.nombre,
        apellido: f.apellido,
        apellidos: f.apellido,
        correo: f.correo,
        telefono: f.telefono,
        estadoVenezuela: f.estadoVenezuela,
        genero: f.genero,
        generosFavoritos: f.generosFavoritos,
        biografia: f.biografia
      };
      localStorage.setItem('usuarioLogueado', JSON.stringify(sesionActualizada));

      this.mostrarMensaje('Cambios guardados con exito', 'exito');
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1200);
    });
  }

  obtenerIniciales(): string {
    const nombre = this.datosFormulario?.nombre || this.perfilOriginal?.nombre || '';
    const apellido = this.datosFormulario?.apellido || this.perfilOriginal?.apellido || '';
    const i1 = nombre.trim() ? nombre.trim().charAt(0).toUpperCase() : '';
    const i2 = apellido.trim() ? apellido.trim().charAt(0).toUpperCase() : '';
    return `${i1}${i2}` || '?';
  }

  cancelar(): void {
    this.router.navigate(['/dashboard']);
  }

  private mostrarMensaje(texto: string, tipo: 'exito' | 'error'): void {
    this.mensajeNotificacion = texto;
    this.tipoNotificacion = tipo;
  }
}