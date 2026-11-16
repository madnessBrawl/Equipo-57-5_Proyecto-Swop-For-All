/*
  Clase: Componente de Autenticación
  Función: Gestiona la recolección de credenciales y solicita al backend la verificación.
  Ruta de datos: UI (HTML) -> AuthComponent -> ServicioAutenticacion (Inyectado) -> Backend
*/
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // 1. Importamos el Router

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./estilos-auth.css']
})
export class AuthComponent {
  // Propiedades de la clase (Estado)
  correo: string = '';
  clave: string = '';

  // 2. Inyectamos el Router en el constructor siguiendo el modelo POO
  constructor(private router: Router) {}

  // Método que se ejecutará al enviar el formulario (Comportamiento)
  ingresar(): void {
    if (this.correo && this.clave) {
      console.log('Datos capturados con éxito:');
      console.log('Correo:', this.correo);
      console.log('Contraseña:', this.clave);

      // Guardar usuario logueado en localStorage para que los demás componentes
      // puedan identificar al usuario actual y cargar su inventario personal.
      // Se usa 'usuario_local' como identificador único del usuario demo.
      localStorage.setItem('usuarioLogueado', JSON.stringify({
        usuario: 'usuario_local',
        nombre: 'Mi Perfil',
        correo: this.correo
      }));

      // REGLA DE NEGOCIO: Al iniciar sesión se limpian los datos de intercambio
      // de sesiones anteriores para evitar que el botón "Intercambiar" quede
      // desbloqueado sin haber iniciado un intercambio en esta sesión.
      this.limpiarDatosIntercambioAnterior();

      this.router.navigate(['/dashboard']);
      // Próximamente: Enviar estos datos al backend (Node.js)
    } else {
      console.warn('Faltan datos por completar.');
    }
  }

  /*
    Elimina cualquier dato de intercambio residual de la sesión anterior.
    Garantiza que el botón "Intercambiar" esté bloqueado al inicio de cada sesión.
  */
  private limpiarDatosIntercambioAnterior(): void {
    sessionStorage.removeItem('libroSolicitado');
    localStorage.removeItem('oferta_activa');
    localStorage.removeItem('oferta_activa_id');
    localStorage.removeItem('ncrypt_oferta_activa');
    localStorage.removeItem('ncrypt_libro_solicitado');
    console.log('[Auth] Datos de intercambio de sesión anterior eliminados.');
  }
}
