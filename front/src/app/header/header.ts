import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <--- Necesario para el @if
import { Router, NavigationEnd, RouterLink } from '@angular/router'; // <--- ¡Importante RouterLink!

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink], // <--- Aquí los agregamos
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent implements OnInit {
  mostrarMenu: boolean = true;

  constructor(private router: Router) {
    // Inicializar visibilidad inmediatamente con la URL actual
    this.actualizarVisibilidadMenu(this.router.url);

    // Escucha los cambios de ruta futuros
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.actualizarVisibilidadMenu(event.urlAfterRedirects || event.url);
      }
    });
  }

  ngOnInit(): void {
    // Al montarse de nuevo el componente, sincroniza la visibilidad de inmediato
    this.actualizarVisibilidadMenu(this.router.url);
  }

  private actualizarVisibilidadMenu(url: string): void {
    const rutaLimpia = (url || '').split('?')[0].split('#')[0];
    // Oculta el menú solo en la pantalla de inicio/login ('/'), en el resto siempre está visible
    this.mostrarMenu = rutaLimpia !== '/' && rutaLimpia !== '';
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
    this.router.navigate(['/modificar-oferta']);
  }

  cerrarSesion(): void {
    // Limpiar datos de sesión del usuario
    localStorage.removeItem('usuarioLogueado');
    // Limpiar datos de intercambio para que al iniciar sesión de nuevo
    // el botón "Intercambiar" quede bloqueado hasta iniciar uno nuevo
    sessionStorage.removeItem('libroSolicitado');
    localStorage.removeItem('oferta_activa');
    localStorage.removeItem('oferta_activa_id');
    localStorage.removeItem('ncrypt_oferta_activa');
    localStorage.removeItem('ncrypt_libro_solicitado');
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