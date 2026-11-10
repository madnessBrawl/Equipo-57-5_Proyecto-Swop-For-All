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
    "INT-2026-01",
    "UsuarioA",
    item.propietario,
    [], // Se llenará con los del inventario
    [item.libro], // El libro que el usuario seleccionó del catálogo ajeno
    "Pendiente"
  );

  localStorage.setItem(`oferta_INT-2026-01`, JSON.stringify(nuevaOferta));
  this.router.navigate(['/modificar-oferta']);
}}