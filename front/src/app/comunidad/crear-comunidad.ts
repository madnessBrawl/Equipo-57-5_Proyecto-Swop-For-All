import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ComunidadService } from '../servicios/comunidad.service';

@Component({
  selector: 'app-crear-comunidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-comunidad.html',
  styleUrl: './crear-comunidad.css'
})
export class CrearComunidadComponent {
  comunidad = {
    nombre: '',
    descripcion: '',
    tipo: 'publico',
    genero: ''
  };

  cargando: boolean = false;

  constructor(
    private router: Router,
    private comunidadService: ComunidadService
  ) {}

  confirmarCreacion(): void {
    // Validación de campos vacíos
    if (!this.comunidad.nombre.trim() || !this.comunidad.descripcion.trim() || !this.comunidad.tipo || !this.comunidad.genero) {
      alert('Por favor rellene todos los campos requeridos');
      return;
    }

    this.cargando = true;
    this.comunidadService.crearComunidad(this.comunidad).subscribe({
      next: (res) => {
        this.cargando = false;
        if (!res.exito) {
          alert(res.mensaje);
          return;
        }

        alert('Comunidad creada con éxito');
        this.router.navigate(['/espacio-comunidad']);
      },
      error: () => {
        this.cargando = false;
        alert('Comunidad creada con éxito');
        this.router.navigate(['/espacio-comunidad']);
      }
    });
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
