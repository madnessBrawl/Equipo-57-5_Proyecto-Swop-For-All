/*
  Clase: Dashboard (Menú Principal)
  Función: Orquesta la navegación hacia los distintos módulos (epic) del sistema.
*/
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./estilos-dashboard.css']
})
export class DashboardComponent {
  constructor(private router: Router) {}
  
  // Métodos de ruteo interno encapsulados
  public navegarA(modulo: string): void {
    // Utiliza el Router de Angular para cambiar la vista (ej: a 'registro-lector')
    console.log(`Navegando al módulo de: ${modulo}`);
    this.router.navigate([modulo]);
  }

  public cerrarSesion(): void {
    // Destruye el objeto sesión local y retorna a Interfaz 1
  }
}
