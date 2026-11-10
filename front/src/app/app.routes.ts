import { Routes } from '@angular/router';
import { AuthComponent } from './auth/script-auth'; // Verifica que la ruta coincida con tu archivo real
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
import { DashboardComponent } from './dashboard/script-dashboard'; // Verifica el nombre exacto de tu clase y archivo
import { PanelReputacionComponent } from './panel-reputacion/script-panel-reputacion'; // Contenedor del módulo Reputación
import { CalificarReputacionComponent } from './calificar-reputacion/script-calificar-reputacion'; // HU Calificar lector o intercambio
import { ConsultarResenasComponent } from './consultar-resenas/script-consultar-resenas'; // HU Consultar reseñas

export const routes: Routes = [
    { path: '', component: PerfilUsuarioComponent}, // Ruta por defecto (Inicio de sesión)
  { path: 'dashboard', component: DashboardComponent }, // Interfaz 2

  // Módulo Reputación: panel con 3 apartados (rutas hijas dentro de /reputacion)
  {
    path: 'reputacion',
    component: PanelReputacionComponent,
    children: [
      { path: '', redirectTo: 'calificar', pathMatch: 'full' }, // Apartado por defecto
      { path: 'calificar', component: CalificarReputacionComponent }, // Calificar lector o intercambio
      { path: 'recibidas', component: ConsultarResenasComponent, data: { modo: 'recibidas' } }, // Reseñas recibidas
      { path: 'enviadas', component: ConsultarResenasComponent, data: { modo: 'enviadas' } }    // Reseñas enviadas
    ]
  },
  // Rutas anteriores: se redirigen al nuevo panel para no romper enlaces viejos
  { path: 'calificar', redirectTo: 'reputacion/calificar', pathMatch: 'full' },
  { path: 'resenas', redirectTo: 'reputacion/recibidas', pathMatch: 'full' },

  // { path: 'registro', component: RegistroLectorComponent } // Lo activaremos luego
];
