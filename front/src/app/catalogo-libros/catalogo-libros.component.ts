import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';

@Component({
  selector: 'app-catalogo-libros',
  standalone: true,
  imports: [],
  templateUrl: './catalogo-libros.component.html',
  styleUrls: ['./catalogo-libros.component.css']
})
export class CatalogoLibrosComponent {
  
  // Libros disponibles de OTROS usuarios (Simulación de catálogo tipo Amazon)
  public catalogo: { libro: Libro; propietario: string }[] = [
    { libro: new Libro("L100", "El Principito", "Antoine de Saint-Exupéry", true), propietario: "Carlos" },
    { libro: new Libro("L101", "1984", "George Orwell", true), propietario: "María" },
    { libro: new Libro("L102", "Fahrenheit 451", "Ray Bradbury", true), propietario: "Pedro" }
  ];

  constructor(private router: Router) {}

  // Iniciar solicitud de intercambio desde el catálogo
  public solicitarIntercambio(item: { libro: Libro; propietario: string }): void {
    const nuevaOferta = new OfertaIntercambio(
      `INT-${Date.now()}`,
      "MiUsuario", // Usuario actual
      item.propietario,
      [], // Libros propios a ofrecer (se añadirán al modificar)
      [item.libro], // Libro solicitado
      "Pendiente"
    );

    // Guardamos la oferta inicial creada en localStorage para persistencia
    localStorage.setItem(`oferta_${nuevaOferta.idIntercambio}`, JSON.stringify(nuevaOferta));
    
    alert(`¡Solicitud enviada a ${item.propietario} por el libro "${item.libro.titulo}"! Ahora serás redirigido a gestionar tu oferta.`);
    
    // Redirigimos a la pantalla de Modificar Oferta para elegir qué ofrecer a cambio
    this.router.navigate(['/modificar-oferta']);
  }
}