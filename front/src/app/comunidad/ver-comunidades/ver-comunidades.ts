import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Comunidad, ComunidadService } from '../../servicios/comunidad.service';

@Component({
  selector: 'app-ver-comunidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ver-comunidades.html',
  styleUrls: ['./ver-comunidades.css']
})
export class VerComunidadesComponent implements OnInit {
  public comunidades: Comunidad[] = [];
  public cargando: boolean = false;

  // Filtros
  public terminoBusqueda: string = '';
  public generoSeleccionado: string = 'todos';
  public soloDisponibles: boolean = false;

  // Modal para comunidad privada
  public mostrarModalPrivada: boolean = false;
  public comunidadSeleccionada: Comunidad | null = null;
  public pasoSolicitud: 'pregunta_usuario' | 'confirmacion_admin' = 'pregunta_usuario';

  public usuarioActual: string = '';

  constructor(
    private comunidadService: ComunidadService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.comunidadService.obtenerUsuarioActual();

    // PASO 1 (instantaneo): Mostrar datos desde cache local sin esperar la red
    const datosInstantaneos = this.comunidadService.obtenerComunidadesInstantaneas();
    if (datosInstantaneos.length > 0) {
      this.comunidades = datosInstantaneos;
      this.cargando = false;
    } else {
      this.cargando = true;
    }

    // PASO 2 (en segundo plano): Sincronizar silenciosamente con el backend
    this.cargarComunidades();
  }

  cargarComunidades(): void {
    this.comunidadService.obtenerComunidades().subscribe({
      next: (data) => {
        this.comunidades = data;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  // Filtrado de comunidades
  get comunidadesFiltradas(): Comunidad[] {
    return this.comunidades.filter(c => {
      const coincideNombre = !this.terminoBusqueda.trim() ||
        c.nombre.toLowerCase().includes(this.terminoBusqueda.trim().toLowerCase());

      const coincideGenero = this.generoSeleccionado === 'todos' ||
        (c.genero && c.genero.toLowerCase() === this.generoSeleccionado.toLowerCase());

      const nroMiembros = Array.isArray(c.miembros) ? c.miembros.length : 1;
      const limite = c.maxMiembros || 20;
      const coincideDisponible = !this.soloDisponibles || nroMiembros < limite;

      return coincideNombre && coincideGenero && coincideDisponible;
    });
  }

  // Lógica del botón "Unirse"
  unirse(comunidad: Comunidad): void {
    const nroMiembros = Array.isArray(comunidad.miembros) ? comunidad.miembros.length : 1;
    const limite = comunidad.maxMiembros || 20;

    // Condición: Si la comunidad llegó a su límite de 20 miembros
    if (nroMiembros >= limite) {
      alert('Comunidad llena');
      return;
    }

    // Si ya es miembro, entra de una vez
    if (Array.isArray(comunidad.miembros) && comunidad.miembros.includes(this.usuarioActual)) {
      this.entrarAComunidad(comunidad);
      return;
    }

    // Condición 1: Comunidad Pública -> entra de una vez
    if (comunidad.tipo === 'publico' || comunidad.tipo === 'publica') {
      this.comunidadService.unirseAComunidad(comunidad.id, this.usuarioActual).subscribe({
        next: (res) => {
          if (res.exito && res.comunidad) {
            this.entrarAComunidad(res.comunidad);
          } else {
            alert(res.mensaje);
          }
        }
      });
      return;
    }

    // Condición 2: Comunidad Privada -> abrir flujo de solicitud
    this.comunidadSeleccionada = comunidad;
    this.pasoSolicitud = 'pregunta_usuario';
    this.mostrarModalPrivada = true;
  }

  // Condición 2.2: Lector presiona "No" a mandar solicitud
  cancelarSolicitud(): void {
    this.mostrarModalPrivada = false;
    this.comunidadSeleccionada = null;
  }

  // Condición 2.1: Lector presiona "Sí" a mandar solicitud
  confirmarEnvioSolicitud(): void {
    // Pasa a la interfaz de confirmación del Administrador de la comunidad
    this.pasoSolicitud = 'confirmacion_admin';
  }

  // Decisión del Administrador: "Sí"
  adminAceptaSolicitud(): void {
    if (!this.comunidadSeleccionada) return;

    this.comunidadService.unirseAComunidad(this.comunidadSeleccionada.id, this.usuarioActual).subscribe({
      next: (res) => {
        alert('Solicitud aceptada');
        this.mostrarModalPrivada = false;
        if (res.comunidad) {
          this.entrarAComunidad(res.comunidad);
        }
      }
    });
  }

  // Decisión del Administrador: "No"
  adminRechazaSolicitud(): void {
    alert('Has sido rechazado por el administrador de la comunidad');
    this.mostrarModalPrivada = false;
    this.comunidadSeleccionada = null;
  }

  entrarAComunidad(comunidad: Comunidad): void {
    this.comunidadService.establecerComunidadActiva(comunidad);
    this.router.navigate(['/espacio-comunidad']);
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
