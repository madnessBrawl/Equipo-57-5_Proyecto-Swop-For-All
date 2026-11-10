/*
  Archivo: script-panel-reputacion.ts   (FRONTEND: front/src/app/panel-reputacion/)
  Clase: PanelReputacionComponent
  Función: Pantalla CONTENEDORA del módulo Reputación. Se abre desde el botón "Reputación"
           del header y muestra 3 apartados (pestañas):
             1. Calificar lector o intercambio  -> /reputacion/calificar
             2. Reseñas recibidas               -> /reputacion/recibidas
             3. Reseñas enviadas                -> /reputacion/enviadas
           No maneja datos: solo navega. Cada apartado es un componente hijo que se dibuja
           en el <router-outlet>.

  CAMINO: Header (botón Reputación) -> Router -> PanelReputacionComponent -> componente hijo
          (CalificarReputacionComponent o ConsultarResenasComponent) -> ServicioReputacion
*/
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-panel-reputacion',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive], // Salida de rutas hijas + enlaces de pestañas
  templateUrl: './panel-reputacion.html',
  styleUrls: ['./estilos-panel-reputacion.css']
})
export class PanelReputacionComponent {}
