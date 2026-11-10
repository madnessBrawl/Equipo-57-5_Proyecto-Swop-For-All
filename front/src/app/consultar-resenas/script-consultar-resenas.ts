/* 
  Clase: ConsultarResenasComponent
  HU: "Consultar reseñas" (Épica Reputación) - 1er Sprint
*/
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServicioReputacion } from '../reputacion/servicio-reputacion';
import { Calificacion } from '../reputacion/modelo-reputacion'; // Clase de dominio
import type { FiltroResenas } from '../reputacion/modelo-reputacion'; // Solo tipo

@Component({
  selector: 'app-consultar-resenas',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './consultar-resenas.html',
  styleUrls: ['./estilos-consultar-resenas.css']
})
export class ConsultarResenasComponent implements OnInit {

  /* 1. ESTADO DE LA PANTALLA (variables)*/
  modo: 'recibidas' | 'enviadas' = 'recibidas'; // Apartado mostrado (lo define la ruta)
  usuarioActual: string | null = null;      // Usuario con sesión iniciada
  filtro: FiltroResenas = 'todas';          // Filtro por tipo de reseña
  resenas: Calificacion[] = [];             // Reseñas mostradas en pantalla
  promedio: number | null = null;           // Promedio como lector (null = sin calificaciones)
  totalEnviadas: number = 0;                // Total de reseñas enviadas sin filtro (modo enviadas)

  /* 2. CONSTANTES USADAS POR LA PLANTILLA*/
  readonly estrellasDisponibles: number[] = [1, 2, 3, 4, 5];                 // Posiciones de estrella
  readonly rutaEstrellaLlena = '/imagenes/calificacion-estrella-llena.png';  // Imagen estrella llena
  readonly rutaEstrellaVacia = '/imagenes/calificacion-estrella-vacia.png';  // Imagen estrella vacía

  // Inyección de dependencias: servicio (datos), router (redirección) y ruta activa (modo)
  constructor(
    private servicio: ServicioReputacion,
    private router: Router,
    private ruta: ActivatedRoute
  ) {}

  /* 3. CICLO DE VIDA: carga inicial*/
  ngOnInit(): void {
    this.modo = this.ruta.snapshot.data['modo'] === 'enviadas' ? 'enviadas' : 'recibidas'; // Modo desde la ruta
    this.usuarioActual = this.servicio.obtenerUsuarioActual(); // Precondición: usuario logueado
    if (!this.usuarioActual) {
      this.router.navigate(['/']); // Sin sesión: se devuelve al inicio de sesión
      return;
    }
    this.actualizarVista();
  }

  /* 4. EVENTOS DE LA PANTALLA*/
  // Al elegir otro filtro (todas / lector / intercambio)
  alCambiarFiltro(filtro: FiltroResenas): void {
    this.filtro = filtro;
    this.actualizarVista();
  }

  /* 5. CONSULTA: pide los datos al servicio según el modo*/
  private actualizarVista(): void {
    if (this.modo === 'enviadas') {
      this.resenas = this.servicio.obtenerResenasEnviadas(this.usuarioActual!, this.filtro);
      this.totalEnviadas = this.servicio.obtenerResenasEnviadas(this.usuarioActual!).length;
    } else {
      this.resenas = this.servicio.obtenerResenas(this.usuarioActual!, this.filtro);   // Solo las del usuario logueado
      this.promedio = this.servicio.calcularPromedio(this.usuarioActual!);
    }
  }

  // Estrellas llenas que se dibujan para un valor (el promedio se redondea al entero más cercano)
  estrellasLlenas(valor: number | null): number {
    return valor === null ? 0 : Math.round(valor);
  }
}
