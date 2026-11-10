/*
  Archivo: script-panel-reputacion.ts
  Clase: PanelReputacionComponent
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
