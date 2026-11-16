import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Comunidad, ComunidadService } from '../../servicios/comunidad.service';

@Component({
  selector: 'app-mi-comunidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mi-comunidad.html',
  styleUrls: ['./mi-comunidad.css']
})
export class MiComunidadComponent implements OnInit {
  public misComunidades: Comunidad[] = [];
  public cargando: boolean = false;
  public usuarioActual: string = '';

  constructor(
    private comunidadService: ComunidadService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.comunidadService.obtenerUsuarioActual();

    // PASO 1 (instantaneo): Mostrar datos desde cache local sin esperar la red
    const datosInstantaneos = this.comunidadService.obtenerMisComunidadesInstantaneas(this.usuarioActual);
    if (datosInstantaneos.length > 0) {
      this.misComunidades = datosInstantaneos;
      this.cargando = false;
    } else {
      this.cargando = true;
    }

    // PASO 2 (en segundo plano): Sincronizar silenciosamente con el backend
    this.comunidadService.obtenerMisComunidades(this.usuarioActual).subscribe({
      next: (data) => {
        this.misComunidades = data;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  abrirEspacioComunidad(comunidad: Comunidad): void {
    this.comunidadService.establecerComunidadActiva(comunidad);
    this.router.navigate(['/espacio-comunidad']);
  }

  irACrearComunidad(): void {
    this.router.navigate(['/crear-comunidad']);
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
