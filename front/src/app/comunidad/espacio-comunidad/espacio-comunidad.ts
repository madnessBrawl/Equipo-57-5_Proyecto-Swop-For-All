import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-espacio-comunidad',
  standalone: true,
  imports: [],
  templateUrl: './espacio-comunidad.html',
  styleUrl: './espacio-comunidad.css'
})
export class EspacioComunidadComponent {
  
  constructor(private router: Router) {}

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}