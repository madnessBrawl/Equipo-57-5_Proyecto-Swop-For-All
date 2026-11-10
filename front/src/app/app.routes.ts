import { Routes } from '@angular/router';
import { AuthComponent } from './auth/script-auth'; // Verifica que la ruta coincida con tu archivo real
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
import { DashboardComponent } from './dashboard/script-dashboard'; // Verifica el nombre exacto de tu clase y archivo
import { CalificarReputacionComponent } from './calificar-reputacion/script-calificar-reputacion'; // HU Calificar lector o intercambio
import { ConsultarResenasComponent } from './consultar-resenas/script-consultar-resenas'; // HU Consultar reseñas

export const routes: Routes = [
    { path: '', component: PerfilUsuarioComponent}, // Ruta por defecto (Inicio de sesión)
  { path: 'dashboard', component: DashboardComponent }, // Interfaz 2
  { path: 'calificar', component: CalificarReputacionComponent }, // Reputación: calificar lector o intercambio
  { path: 'resenas', component: ConsultarResenasComponent }, // Reputación: consultar reseñas
  // { path: 'registro', component: RegistroLectorComponent } // Lo activaremos luego
];
