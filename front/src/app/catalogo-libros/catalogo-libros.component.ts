import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Libro, OfertaIntercambio } from '../modelos/intercambio.model';
import { GoogleBooksService } from '../servicios/google-books.service';

interface ItemCatalogo {
  libro: Libro;
  propietario: string;
}

@Component({
  selector: 'app-catalogo-libros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo-libros.component.html',
  styleUrls: ['./catalogo-libros.component.css']
})
export class CatalogoLibrosComponent implements OnInit {
  public terminoBusqueda: string = '';
  public cargando: boolean = false;
  public catalogo: ItemCatalogo[] = [];

  // Propietarios simulados de la comunidad para asignar a los libros del catálogo
  private readonly lectoresDemo = ['Carlos', 'María', 'Pedro', 'Ana', 'Luis', 'Sofia'];

  constructor(
    private router: Router,
    private googleBooksService: GoogleBooksService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogoInicial();
  }

  // Carga libros iniciales desde Google Books API
  public cargarCatalogoInicial(): void {
    this.cargando = true;
    this.googleBooksService.obtenerCatalogoInicial().subscribe({
      next: (libros) => {
        this.catalogo = libros.map((libro, index) => ({
          libro,
          propietario: this.lectoresDemo[index % this.lectoresDemo.length]
        }));
        this.cargando = false;
      },
      error: () => {
        this.usarCatalogoRespaldo();
        this.cargando = false;
      }
    });
  }

  // Búsqueda en Google Books API por palabra clave
  public buscar(): void {
    if (!this.terminoBusqueda || !this.terminoBusqueda.trim()) {
      this.cargarCatalogoInicial();
      return;
    }

    this.cargando = true;
    this.googleBooksService.buscarLibros(this.terminoBusqueda.trim()).subscribe({
      next: (libros) => {
        this.catalogo = libros.map((libro, index) => ({
          libro,
          propietario: this.lectoresDemo[index % this.lectoresDemo.length]
        }));
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  // Fallback de contingencia si no hay conexión a internet
  private usarCatalogoRespaldo(): void {
    this.catalogo = [
      { libro: new Libro("L100", "El Principito", "Antoine de Saint-Exupéry", true), propietario: "Carlos" },
      { libro: new Libro("L101", "1984", "George Orwell", true), propietario: "María" },
      { libro: new Libro("L102", "Fahrenheit 451", "Ray Bradbury", true), propietario: "Pedro" }
    ];
  }

  // Iniciar solicitud de intercambio desde el catálogo (mantiene el flujo original)
  public solicitarIntercambio(item: ItemCatalogo): void {
    const nuevaOferta = new OfertaIntercambio(
      "INT-2026-01",
      "UsuarioA",
      item.propietario,
      [], // Se llenará con los del inventario
      [item.libro], // El libro que el usuario seleccionó del catálogo
      "Pendiente"
    );

    localStorage.setItem(`oferta_INT-2026-01`, JSON.stringify(nuevaOferta));
    this.router.navigate(['/modificar-oferta']);
  }
}
