import { Routes } from '@angular/router';
import { AuthComponent } from './auth/script-auth'; // Verifica que la ruta coincida con tu archivo real
import { DashboardComponent } from './dashboard/script-dashboard'; // Verifica el nombre exacto de tu clase y archivo

export const routes: Routes = [
    { path: '', component: AuthComponent }, // Ruta por defecto (Inicio de sesión)
  { path: 'dashboard', component: DashboardComponent }, // Interfaz 2
  // { path: 'registro', component: RegistroLectorComponent } // Lo activaremos luego
];
