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
      this.router.navigate(['/dashboard']);
      // Próximamente: Enviar estos datos al backend (Node.js)
    } else {
      console.warn('Faltan datos por completar.');
    }
  }
}