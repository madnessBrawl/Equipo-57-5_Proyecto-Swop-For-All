/*
  Archivo: script-consultar-resenas.ts   (FRONTEND: front/src/app/consultar-resenas/)
  Clase: ConsultarResenasComponent
  HU: "Consultar reseñas" (Épica Reputación) - 1er Sprint

  Función: Muestra la reputación (promedio) y las reseñas recibidas por un lector.
           Solo LEE datos; no modifica nada. La lógica de cálculo vive en ServicioReputacion.

  CAMINO DE PROCESO DE DATOS:
   HTML (selectores) -> ConsultarResenasComponent -> ServicioReputacion.obtenerResenas()
        -> almacenamiento (futuro: ControladorReputacion.consultarResenas)
        -> ServicioReputacion.calcularPromedio() -> HTML (lista + promedio)

  Flujo: usuario logueado -> elige lector (por defecto, él mismo) -> opcional: filtra por tipo
         -> si hay reseñas se listan; si no, se informa con un mensaje claro.
*/
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  /* =========================================================
     1. ESTADO DE LA PANTALLA (variables)
     ========================================================= */
  usuarioActual: string | null = null;      // Usuario con sesión iniciada
  lectores: string[] = [];                  // Lectores que se pueden consultar
  lectorSeleccionado: string = '';          // Lector cuya reputación se muestra
  filtro: FiltroResenas = 'todas';          // Filtro por tipo de reseña
  resenas: Calificacion[] = [];             // Reseñas mostradas en pantalla
  promedio: number | null = null;           // Promedio como lector (null = sin calificaciones)

  /* =========================================================
     2. CONSTANTES USADAS POR LA PLANTILLA
     ========================================================= */
  readonly estrellasDisponibles: number[] = [1, 2, 3, 4, 5];                 // Posiciones de estrella
  readonly rutaEstrellaLlena = '/imagenes/calificacion-estrella-llena.png';  // Imagen estrella llena
  readonly rutaEstrellaVacia = '/imagenes/calificacion-estrella-vacia.png';  // Imagen estrella vacía

  // Inyección de dependencias: el servicio entrega los datos, el router solo redirige
  constructor(private servicio: ServicioReputacion, private router: Router) {}

  /* =========================================================
     3. CICLO DE VIDA: carga inicial
     ========================================================= */
  ngOnInit(): void {
    this.usuarioActual = this.servicio.obtenerUsuarioActual(); // Precondición: usuario logueado
    if (!this.usuarioActual) {
      this.router.navigate(['/']); // Sin sesión: se devuelve al inicio de sesión
      return;
    }
    this.lectores = this.servicio.listarLectores();
    if (!this.lectores.includes(this.usuarioActual)) {
      this.lectores.push(this.usuarioActual); // Garantiza que el propio usuario aparezca
    }
    this.lectorSeleccionado = this.usuarioActual; // Por defecto: "mis reseñas"
    this.actualizarVista();
  }

  /* =========================================================
     4. EVENTOS DE LA PANTALLA
     ========================================================= */
  // Al elegir otro lector
  alCambiarLector(lector: string): void {
    this.lectorSeleccionado = lector;
    this.actualizarVista();
  }

  // Al elegir otro filtro (todas / lector / intercambio)
  alCambiarFiltro(filtro: FiltroResenas): void {
    this.filtro = filtro;
    this.actualizarVista();
  }

  /* =========================================================
     5. CONSULTA: pide los datos al servicio
     ========================================================= */
  private actualizarVista(): void {
    this.resenas = this.servicio.obtenerResenas(this.lectorSeleccionado, this.filtro);
    this.promedio = this.servicio.calcularPromedio(this.lectorSeleccionado);
  }

  // Indica si el lector consultado es el propio usuario (para adaptar los textos)
  get esMiPerfil(): boolean {
    return this.lectorSeleccionado === this.usuarioActual;
  }

  // Estrellas llenas que se dibujan para un valor (el promedio se redondea al entero más cercano)
  estrellasLlenas(valor: number | null): number {
    return valor === null ? 0 : Math.round(valor);
  }
}
