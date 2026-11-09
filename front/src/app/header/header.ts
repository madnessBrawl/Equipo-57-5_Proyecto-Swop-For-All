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
  cerrarSesion(): void {
    localStorage.removeItem('usuarioLogueado'); 
    this.router.navigate(['/']); 
  }
}
