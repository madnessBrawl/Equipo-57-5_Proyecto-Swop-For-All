import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // <--- Necesario para el @if
import { Router, NavigationEnd, RouterLink } from '@angular/router'; // <--- ¡Importante RouterLink!

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink], // <--- Aquí los agregamos
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
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

  // Navega al inventario personal del usuario
  irAInventario(): void {
    this.router.navigate(['/inventario']);
  }

  // Navega al panel de Reputación (calificar, reseñas recibidas y enviadas)
  irAReputacion(): void {
    this.router.navigate(['/reputacion']);
  }

  // Navega a la sala de intercambio activo (con validación de inicio previo desde el catálogo)
  navegarAIntercambio(): void {
    const hayOfertaActiva = Boolean(
      sessionStorage.getItem('libroSolicitado') ||
      localStorage.getItem('oferta_activa') ||
      localStorage.getItem('oferta_activa_id')
    );

    if (!hayOfertaActiva) {
      alert('⚠️ No tienes ningún intercambio activo en este momento.\n\nPor favor, dirígete al Catálogo Global, selecciona el libro que deseas y presiona "Solicitar Intercambio" para iniciar la negociación.');
      this.router.navigate(['/catalogo']);
      return;
    }

    this.router.navigate(['/modificar-oferta']);
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
      alert('Usted ya alcanzó el límite de comunidades permitidas.'); 
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