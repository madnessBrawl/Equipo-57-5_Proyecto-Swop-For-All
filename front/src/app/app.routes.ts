import { Routes } from '@angular/router';
import { AuthComponent } from './auth/script-auth'; // Verifica que la ruta coincida con tu archivo real
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
import { DashboardComponent } from './dashboard/script-dashboard'; // Verifica el nombre exacto de tu clase y archivo
import { PanelReputacionComponent } from './panel-reputacion/script-panel-reputacion'; // Contenedor del módulo Reputación
import { CalificarReputacionComponent } from './calificar-reputacion/script-calificar-reputacion'; // HU Calificar lector o intercambio
import { ConsultarResenasComponent } from './consultar-resenas/script-consultar-resenas'; // HU Consultar reseñas
import { CrearComunidadComponent } from './comunidad/crear-comunidad';  // Importa el componente
import { ModificarOfertaComponent } from './modificar-oferta/modificar-oferta.component';
import { CatalogoLibrosComponent } from './catalogo-libros/catalogo-libros.component';

// 1. Agregamos la importación que faltaba
import { EspacioComunidadComponent } from './comunidad/espacio-comunidad/espacio-comunidad';

export const routes: Routes = [
  { path: '', component: PerfilUsuarioComponent }, 
  { path: 'dashboard', component: DashboardComponent }, 
  
  // ¡Rutas de comunidad movidas aquí afuera! (Nivel principal)
  { path: 'crear-comunidad', component: CrearComunidadComponent },
 { path: 'espacio-comunidad', component: EspacioComunidadComponent },
  { path: 'catalogo', 
    component: CatalogoLibrosComponent },
 { 
    path: 'modificar-oferta', 
    component: ModificarOfertaComponent 
  },

  // Módulo Reputación
  { 
    path: 'reputacion',
    component: PanelReputacionComponent,
    children: [
      { path: '', redirectTo: 'calificar', pathMatch: 'full' },
      { path: 'calificar', component: CalificarReputacionComponent },
      { path: 'recibidas', component: ConsultarResenasComponent, data: { modo: 'recibidas' } },
      { path: 'enviadas', component: ConsultarResenasComponent, data: { modo: 'enviadas' } }
    ]
  },
  
  // Rutas anteriores (redirects)
  { path: 'calificar', redirectTo: 'reputacion/calificar', pathMatch: 'full' },
  { path: 'resenas', redirectTo: 'reputacion/recibidas', pathMatch: 'full' }
];
