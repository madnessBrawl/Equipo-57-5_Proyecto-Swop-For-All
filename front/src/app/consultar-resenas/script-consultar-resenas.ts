/* 
  Clase: ConsultarResenasComponent
  HU: "Consultar reseñas" (Épica Reputación) - 1er Sprint
*/
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
  cargando = false;
  errorConsulta = '';
  private resenasSinFiltrar: Calificacion[] | null = null;

  /* 2. CONSTANTES USADAS POR LA PLANTILLA*/
  readonly estrellasDisponibles: number[] = [1, 2, 3, 4, 5];                 // Posiciones de estrella
  readonly rutaEstrellaLlena = '/imagenes/calificacion-estrella-llena.png';  // Imagen estrella llena
  readonly rutaEstrellaVacia = '/imagenes/calificacion-estrella-vacia.png';  // Imagen estrella vacía

  // Inyección de dependencias: servicio (datos), router (redirección) y ruta activa (modo)
  constructor(
    private servicio: ServicioReputacion,
    private router: Router,
    private ruta: ActivatedRoute,
    private readonly changeDetector: ChangeDetectorRef
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
    if (this.resenasSinFiltrar !== null) {
      this.aplicarFiltro();
      this.changeDetector.markForCheck();
    } else if (!this.cargando) {
      this.actualizarVista();
    }
  }

  /* 5. CONSULTA: pide los datos al servicio según el modo*/
  private actualizarVista(): void {
    if (!this.usuarioActual) return;
    this.cargando = true;
    this.errorConsulta = '';

    const consulta = this.modo === 'enviadas'
      ? this.servicio.obtenerResenasEnviadas(this.usuarioActual)
      : this.servicio.obtenerResenas(this.usuarioActual);

    consulta.subscribe({
      next: resenas => {
        this.resenasSinFiltrar = resenas;
        if (this.modo === 'enviadas') {
          this.totalEnviadas = resenas.length;
        } else {
          const resenasDeLector = resenas.filter(resena => resena.tipo === 'lector');
          this.promedio = resenasDeLector.length
            ? Math.round(resenasDeLector.reduce((suma, resena) => suma + resena.puntuacion, 0) / resenasDeLector.length * 10) / 10
            : null;
        }
        this.aplicarFiltro();
        this.cargando = false;
        this.changeDetector.markForCheck();
      },
      error: error => this.mostrarErrorConsulta(error)
    });
  }

  private aplicarFiltro(): void {
    const resenas = this.resenasSinFiltrar || [];
    this.resenas = this.filtro === 'todas'
      ? [...resenas]
      : resenas.filter(resena => resena.tipo === this.filtro);
  }

  private mostrarErrorConsulta(error: unknown): void {
    this.resenas = [];
    this.resenasSinFiltrar = null;
    this.promedio = null;
    this.totalEnviadas = 0;
    this.cargando = false;
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      this.errorConsulta = error.error.error;
    } else if (error instanceof HttpErrorResponse && error.status === 0) {
      this.errorConsulta = 'No se pudo comunicar con el backend. Compruebe que la aplicación siga ejecutándose.';
    } else if (error instanceof Error && error.name === 'TimeoutError') {
      this.errorConsulta = 'La consulta de reseñas tardó demasiado. Inténtelo de nuevo.';
    } else {
      this.errorConsulta = 'No se pudieron cargar las reseñas.';
    }
    this.changeDetector.markForCheck();
  }

  // Estrellas llenas que se dibujan para un valor (el promedio se redondea al entero más cercano)
  estrellasLlenas(valor: number | null): number {
    return valor === null ? 0 : Math.round(valor);
  }
}
