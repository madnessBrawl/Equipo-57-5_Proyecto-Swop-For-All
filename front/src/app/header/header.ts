import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent{
  mostrarMenu: boolean = false;

  constructor(private router: Router) {
    // Escucha los cambios de ruta
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Si la ruta es '/' (inicio de sesión), ocultamos el menú. En el resto, se muestra.
        this.mostrarMenu = event.url !== '/';
      }
    });
  
  }
  // Navega al panel de Reputación (calificar, reseñas recibidas y enviadas)
  irAReputacion(): void {
    this.router.navigate(['/reputacion']);
  }

  cerrarSesion(): void {
    localStorage.removeItem('usuarioLogueado'); 
    this.router.navigate(['/']); 
  }

  // Variable para controlar si el menú desplegable está visible
  mostrarMenuComunidad: boolean = false;

  // Función para alternar el menú desplegable
  toggleMenuComunidad(): void {
    this.mostrarMenuComunidad = !this.mostrarMenuComunidad;
  }

  // Función que evalúa la condición del Paso 1 antes de navegar
  verificarLimiteYCrear(): void {
    const usuarioActual = JSON.parse(localStorage.getItem('usuarioLogueado') || '{}');
    
    // Obtenemos las comunidades creadas por este usuario (simulación de BD)
    const misComunidades = JSON.parse(localStorage.getItem(`comunidades_${usuarioActual.usuario}`) || '[]');

    // Condición: Límite de 5 comunidades
    if (misComunidades.length >= 5) {
      alert('Usted ya alcanzó el límite de comunidades permitidas.'); //
    } else {
      this.mostrarMenuComunidad = false; // Cerramos el dropdown
      this.router.navigate(['/crear-comunidad']);
    }
  }

  navegarA(ruta: string): void {
    this.mostrarMenuComunidad = false;
    this.router.navigate([ruta]);
  }
}
