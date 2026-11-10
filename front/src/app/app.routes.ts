import { Routes } from '@angular/router';
import { AuthComponent } from './auth/script-auth'; // Verifica que la ruta coincida con tu archivo real
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario';
import { DashboardComponent } from './dashboard/script-dashboard'; // Verifica el nombre exacto de tu clase y archivo
import { PanelReputacionComponent } from './panel-reputacion/script-panel-reputacion'; // Contenedor del módulo Reputación
import { CalificarReputacionComponent } from './calificar-reputacion/script-calificar-reputacion'; // HU Calificar lector o intercambio
import { ConsultarResenasComponent } from './consultar-resenas/script-consultar-resenas'; // HU Consultar reseñas
<<<<<<< HEAD
import { CrearComunidadComponent } from './comunidad/crear-comunidad';  // Importa el componente

// 1. Agregamos la importación que faltaba
import { EspacioComunidadComponent } from './comunidad/espacio-comunidad/espacio-comunidad';
=======
import { EnviarOfertaComponent } from './enviar-oferta/script-enviar-oferta';
import { ExplorarCatalogoComponent } from './explorar-catalogo/script-explorar-catalogo';
>>>>>>> b99bfba72a9dad85da0ba43d7373840ad8ac1cdc

export const routes: Routes = [
  { path: '', component: PerfilUsuarioComponent }, 
  { path: 'dashboard', component: DashboardComponent }, 
  
  // ¡Rutas de comunidad movidas aquí afuera! (Nivel principal)
  { path: 'crear-comunidad', component: CrearComunidadComponent },
  { path: 'espacio-comunidad', component: EspacioComunidadComponent },

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
<<<<<<< HEAD
  { path: 'resenas', redirectTo: 'reputacion/recibidas', pathMatch: 'full' }
=======
  { path: 'resenas', redirectTo: 'reputacion/recibidas', pathMatch: 'full' },

  // { path: 'registro', component: RegistroLectorComponent } // Lo activaremos luego
  { path: 'enviar-oferta', component: EnviarOfertaComponent },
  { path: 'catalogo', component: ExplorarCatalogoComponent }
>>>>>>> b99bfba72a9dad85da0ba43d7373840ad8ac1cdc
];
