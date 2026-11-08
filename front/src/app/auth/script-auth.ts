/*
  Clase: Componente de Autenticación
  Función: Gestiona la recolección de credenciales y solicita al backend la verificación.
  Ruta de datos: UI (HTML) -> AuthComponent -> ServicioAutenticacion (Inyectado) -> Backend
*/
import { Component } from '@angular/core';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.html',
  styleUrls: ['./estilos-auth.css']
})
export class AuthComponent {
  // Objeto que encapsula las credenciales antes de enviarlas al servidor
  private credenciales = {
    correo: '',
    clave: ''
  };

  // Método invocado por el botón "Ingresar"
  public procesarAutenticacion(): void {
    // Aquí se invoca el servicio que conecta con la API del backend
    console.log("Iniciando verificación de credenciales para:", this.credenciales.correo);
    // Lógica de redirección al Dashboard (Interfaz 2) tras éxito
  }
}