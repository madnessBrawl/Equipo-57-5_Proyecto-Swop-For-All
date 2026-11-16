import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Comunidad, ComunidadService, MensajeComunidad } from '../../servicios/comunidad.service';

@Component({
  selector: 'app-espacio-comunidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './espacio-comunidad.html',
  styleUrl: './espacio-comunidad.css'
})
export class EspacioComunidadComponent implements OnInit {
  public comunidad: Comunidad | null = null;
  public usuarioActual: string = '';
  public textoMensaje: string = '';

  // Control del modal / tarjeta de miembros
  public mostrarModalMiembros: boolean = false;

  constructor(
    private router: Router,
    private comunidadService: ComunidadService
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.comunidadService.obtenerUsuarioActual();
    this.cargarComunidad();
  }

  cargarComunidad(): void {
    const activa = this.comunidadService.obtenerComunidadActiva();
    if (activa) {
      this.comunidad = activa;
    } else {
      // Fallback a primera comunidad disponible
      this.comunidadService.obtenerComunidades().subscribe(lista => {
        if (lista.length > 0) {
          this.comunidad = lista[0];
          this.comunidadService.establecerComunidadActiva(this.comunidad);
        }
      });
    }
  }

  get totalMiembros(): number {
    return this.comunidad?.miembros?.length || 1;
  }

  get esAdmin(): boolean {
    if (!this.comunidad) return false;
    return this.comunidad.creador?.toLowerCase() === this.usuarioActual.toLowerCase() ||
           (this.comunidad.administradores || []).some(a => a.toLowerCase() === this.usuarioActual.toLowerCase());
  }

  // Toggle para la tarjeta de miembros (Página 3 del PDF)
  toggleModalMiembros(): void {
    this.mostrarModalMiembros = !this.mostrarModalMiembros;
  }

  // Obtener rol del miembro (creador = Administrador, demás = Miembro)
  obtenerRol(miembro: string): string {
    if (!this.comunidad) return 'Miembro';
    const esCreadorOAdmin = this.comunidad.creador?.toLowerCase() === miembro.toLowerCase() ||
      (this.comunidad.administradores || []).some(a => a.toLowerCase() === miembro.toLowerCase());
    return esCreadorOAdmin ? 'Administrador' : 'Miembro';
  }

  // Enviar mensaje al chat general de la comunidad
  enviarMensaje(): void {
    if (!this.textoMensaje.trim() || !this.comunidad) return;

    const texto = this.textoMensaje.trim();
    this.textoMensaje = '';

    this.comunidadService.enviarMensaje(this.comunidad.id, this.usuarioActual, texto).subscribe(msg => {
      if (msg && this.comunidad) {
        if (!Array.isArray(this.comunidad.mensajes)) {
          this.comunidad.mensajes = [];
        }
        this.comunidad.mensajes.push(msg);
      }
    });
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
