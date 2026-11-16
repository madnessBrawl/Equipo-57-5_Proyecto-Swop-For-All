/*
  Archivo: CifradoService.js (BACKEND: back/Service/)
  Clase: CifradoService
  Función: Servicio orientado a objetos para encriptación y desencriptación de datos
           sensibles (perfiles, ofertas, inventario) utilizando el paquete npm "ncrypt-js".
           Cumple con el requisito no funcional de Confidencialidad y Seguridad (Diseño 3 / C4).
*/

const { ncrypt } = require('ncrypt-js');

class CifradoService {
  constructor(claveSecreta = process.env.CLAVE_CIFRADO || 'swop-for-all-secret-key-2026') {
    // Encapsulamiento del atributo clave secreta
    this._claveSecreta = String(claveSecreta);
    // Instancia de la clase ncrypt proveída por el paquete npm
    this._ncrypt = new ncrypt(this._claveSecreta);
  }

  // Getters para verificación de estado del servicio
  get claveConfigurada() {
    return Boolean(this._claveSecreta);
  }

  /*
    Cifra un objeto o dato primitivo a una cadena hexadecimal segura.
    Garantiza que la información esté oculta ante accesos no autorizados.
  */
  cifrar(dato) {
    if (dato === undefined || dato === null) {
      throw new Error('Debe proporcionar un dato para encriptar.');
    }
    try {
      return this._ncrypt.encrypt(dato);
    } catch (error) {
      throw new Error(`Error durante el cifrado con ncrypt-js: ${error.message}`);
    }
  }

  /*
    Descifra una cadena previamente encriptada retornando el dato u objeto original.
  */
  descifrar(cadenaCifrada) {
    if (!cadenaCifrada || typeof cadenaCifrada !== 'string') {
      throw new Error('Debe proporcionar una cadena cifrada válida.');
    }
    try {
      return this._ncrypt.decrypt(cadenaCifrada);
    } catch (error) {
      throw new Error(`Error durante el descifrado con ncrypt-js: ${error.message}`);
    }
  }

  /*
    Verifica si una cadena tiene el formato característico de ncrypt-js (vector.cifrado)
  */
  esCifradoValido(cadena) {
    if (typeof cadena !== 'string') return false;
    const partes = cadena.split('.');
    return partes.length === 2 && partes[0].length > 0 && partes[1].length > 0;
  }
}

module.exports = CifradoService;
