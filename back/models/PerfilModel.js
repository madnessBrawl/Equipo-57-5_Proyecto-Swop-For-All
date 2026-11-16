/*
  Archivo: PerfilModel.js (BACKEND: back/models/)
  Clase: PerfilModel
  Función: Representa el objeto de dominio del Perfil del Lector bajo el paradigma POO.
           Contiene los atributos del usuario, encapsula su estado y valida sus reglas de formato.
*/

class PerfilModel {
  // Constantes de clase para validaciones de longitud y formato
  static LONGITUD_MINIMA_NOMBRE = 2; // Longitud mínima para nombres y apellidos
  static LONGITUD_MAXIMA_TEXTO = 100; // Longitud máxima general
  static LONGITUD_MAXIMA_BIO = 400; // Longitud máxima para la biografía del lector
  static GENEROS_PERMITIDOS = ['Hombre', 'Mujer', 'Otro', 'Prefiero no decir']; // Lista de géneros permitidos

  /**
   * Constructor de la clase PerfilModel
   * @param {Object} datos - Objeto con las propiedades del perfil
   */
  constructor({
    usuario = '',
    nombre = '',
    apellido = '',
    correo = '',
    telefono = '',
    estadoVenezuela = 'Distrito Capital',
    genero = 'Prefiero no decir',
    generosFavoritos = '',
    biografia = '',
    reputacion = 5.0,
    clave = ''
  } = {}) {
    // Identificador único del usuario (no editable tras el registro)
    this.usuario = String(usuario ?? '').trim();

    // Nombre(s) del lector
    this.nombre = String(nombre ?? '').trim();

    // Apellido(s) del lector
    this.apellido = String(apellido ?? '').trim();

    // Correo electrónico de contacto
    this.correo = String(correo ?? '').trim().toLowerCase();

    // Número de teléfono de contacto (Venezuela)
    this.telefono = String(telefono ?? '').trim();

    // Estado territorial de residencia en Venezuela
    this.estadoVenezuela = String(estadoVenezuela ?? 'Distrito Capital').trim();

    // Género del lector
    this.genero = String(genero ?? 'Prefiero no decir').trim();

    // Géneros literarios que le interesa leer o intercambiar
    this.generosFavoritos = String(generosFavoritos ?? '').trim();

    // Biografía o breve descripción personal
    this.biografia = String(biografia ?? '').trim();

    // Puntuación promedio del lector en intercambios (1 a 5)
    this.reputacion = Number(reputacion) || 5.0;

    // Contraseña cifrada o en texto de autenticación
    this.clave = String(clave ?? '');
  }

  /**
   * Valida el formato del correo electrónico mediante expresión regular
   * @returns {boolean} True si el correo tiene una estructura válida
   */
  esCorreoValido() {
    // Expresión regular estándar para comprobar formato de email
    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return patronCorreo.test(this.correo);
  }

  /**
   * Valida el formato de teléfono venezolano (ej: 0414..., 0424..., 0412..., 0416...)
   * @returns {boolean} True si el teléfono está vacío (opcional) o cumple formato
   */
  esTelefonoValido() {
    // El teléfono puede ser opcional, pero si se coloca debe tener al menos 10 dígitos numéricos
    if (!this.telefono) return true;
    const patronTelefono = /^0(412|414|424|416|426|212)\d{7}$/;
    return patronTelefono.test(this.telefono.replace(/[\s-]/g, ''));
  }

  /**
   * Valida que los datos obligatorios existan y cumplan las reglas de longitud
   * @returns {string|null} Retorna mensaje de error o null si el modelo es válido
   */
  validar() {
    // Verificación de usuario
    if (!this.usuario) {
      return 'El nombre de usuario es obligatorio.';
    }

    // Verificación de nombre
    if (!this.nombre || this.nombre.length < PerfilModel.LONGITUD_MINIMA_NOMBRE) {
      return `El nombre debe tener al menos ${PerfilModel.LONGITUD_MINIMA_NOMBRE} caracteres.`;
    }

    // Verificación de apellido
    if (!this.apellido || this.apellido.length < PerfilModel.LONGITUD_MINIMA_NOMBRE) {
      return `El apellido debe tener al menos ${PerfilModel.LONGITUD_MINIMA_NOMBRE} caracteres.`;
    }

    // Verificación de correo electrónico
    if (!this.correo) {
      return 'El correo electrónico es obligatorio.';
    }

    // Validación de formato de correo
    if (!this.esCorreoValido()) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    // Validación de formato de teléfono
    if (!this.esTelefonoValido()) {
      return 'El teléfono debe ser un número válido de Venezuela (ej: 04141234567).';
    }

    // Validación de biografía máxima
    if (this.biografia.length > PerfilModel.LONGITUD_MAXIMA_BIO) {
      return `La biografía no puede exceder los ${PerfilModel.LONGITUD_MAXIMA_BIO} caracteres.`;
    }

    // Todo es válido
    return null;
  }

  /**
   * Genera un objeto seguro sin exponer la contraseña
   * @returns {Object} Datos públicos y editables del perfil
   */
  aObjetoPublico() {
    return {
      usuario: this.usuario,
      nombre: this.nombre,
      apellido: this.apellido,
      correo: this.correo,
      telefono: this.telefono,
      estadoVenezuela: this.estadoVenezuela,
      genero: this.genero,
      generosFavoritos: this.generosFavoritos,
      biografia: this.biografia,
      reputacion: this.reputacion
    };
  }
}

// Exportamos la clase para su uso en repositorios, servicios y controladores
module.exports = PerfilModel;
