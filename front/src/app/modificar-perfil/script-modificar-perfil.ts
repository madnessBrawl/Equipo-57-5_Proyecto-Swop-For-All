/*
  Componente: ModificarPerfilComponent
  Historia de Usuario: Modificar Perfil
*/

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Clase de dominio POO del perfil del lector
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
    public reputacion: number = 5.0,
    public clave: string = ''
  ) {}

  // Validacion de formato y campos obligatorios
  validar(): string | null {
    if (!this.nombre.trim()) {
      return 'El nombre no puede estar vacío.';
    }
    if (!this.apellido.trim()) {
      return 'El apellido no puede estar vacío.';
    }
    if (!this.correo.trim()) {
      return 'El correo electrónico es obligatorio.';
    }

    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!patronCorreo.test(this.correo.trim())) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    if (this.telefono.trim()) {
      const telLimpio = this.telefono.replace(/[\s-]/g, '');
      const patronTel = /^0(412|414|424|416|426|212)\d{7}$/;
      if (!patronTel.test(telLimpio)) {
        return 'El teléfono debe ser un número válido de Venezuela (ej: 04141234567).';
      }
    }

    if (this.biografia && this.biografia.length > 400) {
      return 'La biografía no puede exceder los 400 caracteres.';
    }

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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarPerfilDesdeSesion();
  }

  // Carga los datos del perfil activo sin pedir re-autenticacion
  private cargarPerfilDesdeSesion(): void {
    const sesion = localStorage.getItem('usuarioLogueado');

    if (sesion) {
      try {
        const u = JSON.parse(sesion);
        this.perfilOriginal = new PerfilLectorDominio(
          u.usuario || 'Juan02',
          u.nombre || 'Juan',
          u.apellido || 'Santana',
          u.correo || 'juanito023@gmail.com',
          u.telefono || '04143731047',
          u.estadoVenezuela || 'Distrito Capital',
          u.genero || 'Hombre',
          u.generosFavoritos || 'Terror',
          u.biografia || '',
          Number(u.reputacion) || 5.0,
          u.clave || '123456'
        );
      } catch (e) {
        this.crearPerfilPredeterminado();
      }
    } else {
      this.crearPerfilPredeterminado();
    }

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
  }

  private crearPerfilPredeterminado(): void {
    this.perfilOriginal = new PerfilLectorDominio(
      'Juan02',
      'Juan',
      'Santana',
      'juanito023@gmail.com',
      '04143731047',
      'Distrito Capital',
      'Hombre',
      'Terror',
      'Lector buscando intercambiar libros.',
      5.0,
      '123456'
    );
    localStorage.setItem('usuarioLogueado', JSON.stringify(this.perfilOriginal));
  }

  // Guarda los cambios verificando validacion de dominio y unicidad
  guardarCambios(): void {
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

    // 1. Validacion en el modelo
    const errorValidacion = perfilModificado.validar();
    if (errorValidacion) {
      this.mostrarMensaje(errorValidacion, 'error');
      return;
    }

    // 2. Verificacion de unicidad en repositorio
    const listaUsuariosRaw = localStorage.getItem('swop_usuarios');
    if (listaUsuariosRaw) {
      try {
        const usuarios = JSON.parse(listaUsuariosRaw);

        const correoEnUso = usuarios.some(
          (u: any) => u.usuario.toLowerCase() !== this.perfilOriginal.usuario.toLowerCase() &&
               u.correo.toLowerCase() === f.correo.trim().toLowerCase()
        );
        if (correoEnUso) {
          this.mostrarMensaje('El correo electrónico ya se encuentra registrado por otro usuario.', 'error');
          return;
        }

        if (f.telefono.trim()) {
          const telLimpio = f.telefono.replace(/[\s-]/g, '');
          const telEnUso = usuarios.some(
            (u: any) => u.usuario.toLowerCase() !== this.perfilOriginal.usuario.toLowerCase() &&
                 u.telefono && u.telefono.replace(/[\s-]/g, '') === telLimpio
          );
          if (telEnUso) {
            this.mostrarMensaje('El teléfono ya se encuentra registrado por otro usuario.', 'error');
            return;
          }
        }
      } catch (e) {
        console.error('Error al verificar unicidad:', e);
      }
    }

    // 3. Confirmacion del actor
    const confirmacion = confirm('¿Está seguro de que desea guardar los cambios en su perfil?');
    if (!confirmacion) {
      return;
    }

    // 4. Persistencia
    this.perfilOriginal = perfilModificado;
    localStorage.setItem('usuarioLogueado', JSON.stringify(this.perfilOriginal));

    if (listaUsuariosRaw) {
      try {
        const usuarios = JSON.parse(listaUsuariosRaw);
        const idx = usuarios.findIndex((u: any) => u.usuario.toLowerCase() === this.perfilOriginal.usuario.toLowerCase());
        if (idx !== -1) {
          usuarios[idx] = this.perfilOriginal;
          localStorage.setItem('swop_usuarios', JSON.stringify(usuarios));
        }
      } catch (e) {
        console.error('Error actualizando lista general:', e);
      }
    }

    // 5. Mensaje de confirmacion segun requerimiento metodologico
    this.mostrarMensaje('información actualizada con éxito', 'exito');

    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 1200);
  }

  // Genera iniciales del avatar
  obtenerIniciales(): string {
    const nombre = this.datosFormulario?.nombre || this.perfilOriginal?.nombre || 'J';
    const apellido = this.datosFormulario?.apellido || this.perfilOriginal?.apellido || 'S';
    const inicial1 = nombre.trim() ? nombre.trim().charAt(0).toUpperCase() : '';
    const inicial2 = apellido.trim() ? apellido.trim().charAt(0).toUpperCase() : '';
    return `${inicial1}${inicial2}` || 'JS';
  }

  // Regresa al menu principal
  cancelar(): void {
    this.router.navigate(['/dashboard']);
  }

  private mostrarMensaje(texto: string, tipo: 'exito' | 'error'): void {
    this.mensajeNotificacion = texto;
    this.tipoNotificacion = tipo;
  }
}