import { Routes } from '@angular/router';
import { AuthComponent } from './auth/script-auth';
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
import { DashboardComponent } from './dashboard/script-dashboard';
import { PanelReputacionComponent } from './panel-reputacion/script-panel-reputacion';
import { CalificarReputacionComponent } from './calificar-reputacion/script-calificar-reputacion';
import { ConsultarResenasComponent } from './consultar-resenas/script-consultar-resenas';
import { CrearComunidadComponent } from './comunidad/crear-comunidad';
import { ModificarOfertaComponent } from './modificar-oferta/modificar-oferta.component';
import { CatalogoLibrosComponent } from './catalogo-libros/catalogo-libros.component';
import { EspacioComunidadComponent } from './comunidad/espacio-comunidad/espacio-comunidad';
import { ModificarPerfilComponent } from './modificar-perfil/script-modificar-perfil';
import { InventarioComponent } from './inventario/inventario.component';

export const routes: Routes = [
  { path: '', component: PerfilUsuarioComponent }, 
  { path: 'dashboard', component: DashboardComponent }, 
  
  // Ruta Modificar Perfil
  { path: 'modificar-perfil', component: ModificarPerfilComponent },
  { path: 'perfil', component: ModificarPerfilComponent },

  // Ruta Inventario personal del usuario
  { path: 'inventario', component: InventarioComponent },

  // Rutas de comunidad (Nivel principal)
  { path: 'crear-comunidad', component: CrearComunidadComponent },
  { path: 'espacio-comunidad', component: EspacioComunidadComponent },
  { path: 'catalogo', component: CatalogoLibrosComponent },
  { path: 'explorar-catalogo', redirectTo: 'catalogo', pathMatch: 'full' },
  { path: 'catalogo-global', redirectTo: 'catalogo', pathMatch: 'full' },
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
