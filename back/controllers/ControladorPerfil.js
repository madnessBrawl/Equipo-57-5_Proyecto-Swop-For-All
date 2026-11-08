/*
  Clase: ControladorPerfil
  Función: Recibe el objeto PerfilLector desde el Frontend (Angular) y gestiona la Base de Datos.
*/
class ControladorPerfil {
  constructor(baseDeDatos) {
    this.bd = baseDeDatos; // Inyección de dependencia de la DB
  }

  // Método llamado por la ruta POST /api/perfil
  registrarNuevoPerfil(datosPerfil) {
    // La verificación de unicidad ocurre aquí en el back, consultando repositorios reales
    const perfilExistente = this.bd.buscarPorNombre(datosPerfil.nombres);
    
    if (perfilExistente) {
      throw new Error("El perfil ya existe en el sistema.");
    }

    // Guardar el objeto en BD
    return this.bd.guardar('Perfiles', datosPerfil);
  }
}

module.exports = ControladorPerfil;