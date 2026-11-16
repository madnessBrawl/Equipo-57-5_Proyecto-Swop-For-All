/*
  Archivo: CifradoService.js (BACKEND: back/Service/)
  Clase: CifradoService
  Función: Implementa el Requisito No Funcional de Seguridad (RNF-SEG-01):
           Confidencialidad y protección de datos sensibles mediante cifrado
           simétrico AES-256-CBC usando el paquete npm "ncrypt-js".

  PAQUETE NPM UTILIZADO:
    - Nombre: ncrypt-js (v2.3.0)
    - URL: https://www.npmjs.com/package/ncrypt-js
    - Algoritmo: AES-256-CBC con derivación de clave via scrypt
    - Instalación: npm install ncrypt-js (ya incluido en package.json)

  DATOS PROTEGIDOS:
    - Ofertas de intercambio (libros ofrecidos/solicitados, estado de negociación)
    - Datos exportados de persistencia (backups cifrados de JSON)
    - Inventario de usuarios en tránsito

  ARQUITECTURA:
    - Backend (Node.js): ncrypt-js real (AES-256-CBC via node:crypto)
    - Frontend (Angular): SubtleCrypto / Web Crypto API (mismo algoritmo AES-256-CBC)
    - Ambas capas comparten la misma clave secreta definida en .env
*/

const { ncrypt } = require('ncrypt-js');

class CifradoService {
  /*
    Constructor: inicializa ncrypt-js con la clave secreta.
    La clave se configura mediante variable de entorno CLAVE_CIFRADO
    para no exponerla en el código fuente (buena práctica de seguridad).
  */
  constructor(claveSecreta = process.env.CLAVE_CIFRADO || 'swop-for-all-secret-key-2026') {
    // Encapsulamiento: atributo privado con convención _
    this._claveSecreta = String(claveSecreta);
    // Instancia de ncrypt (paquete npm ncrypt-js) con la clave configurada
    this._ncrypt = new ncrypt(this._claveSecreta);
  }

  // Getter: verifica que la clave secreta esté configurada
  get claveConfigurada() {
    return Boolean(this._claveSecreta && this._claveSecreta.length > 0);
  }

  // Getter: retorna el algoritmo usado (informativo)
  get algoritmoCifrado() {
    return 'AES-256-CBC (ncrypt-js npm)';
  }

  /*
    cifrar(dato): Cifra cualquier dato (objeto, string, número, booleano)
    usando AES-256-CBC del paquete ncrypt-js.

    @param  {any}    dato - Dato a cifrar (se serializa a JSON internamente)
    @returns {string}      Cadena cifrada en formato "<iv_hex>.<datos_hex>"

    SEGURIDAD: Cada cifrado genera un IV aleatorio distinto,
    por lo que el mismo dato produce una cadena diferente en cada llamada.
  */
  cifrar(dato) {
    if (dato === undefined || dato === null) {
      throw new Error('[CifradoService] Debe proporcionar un dato para encriptar.');
    }
    try {
      // ncrypt.encrypt() usa AES-256-CBC con IV aleatorio y clave derivada con scrypt
      return this._ncrypt.encrypt(dato);
    } catch (error) {
      throw new Error(`[CifradoService] Error durante el cifrado con ncrypt-js: ${error.message}`);
    }
  }

  /*
    descifrar(cadenaCifrada): Descifra una cadena previamente cifrada
    con ncrypt-js y retorna el dato original deserializado.

    @param  {string} cadenaCifrada - Cadena con formato "<iv_hex>.<datos_hex>"
    @returns {any}                   Dato u objeto original
  */
  descifrar(cadenaCifrada) {
    if (!cadenaCifrada || typeof cadenaCifrada !== 'string') {
      throw new Error('[CifradoService] Debe proporcionar una cadena cifrada válida.');
    }
    try {
      // ncrypt.decrypt() revierte AES-256-CBC usando la misma clave e IV del payload
      return this._ncrypt.decrypt(cadenaCifrada);
    } catch (error) {
      throw new Error(`[CifradoService] Error durante el descifrado con ncrypt-js: ${error.message}`);
    }
  }

  /*
    cifrarObjeto(objeto): Cifra un objeto JavaScript completo.
    Útil para proteger ofertas de intercambio, perfiles de usuario
    e inventarios antes de enviarlos al cliente o guardarlos en disco.

    @param  {object} objeto - Objeto a proteger
    @returns {string}         Cadena cifrada con ncrypt-js
  */
  cifrarObjeto(objeto) {
    if (typeof objeto !== 'object' || objeto === null) {
      throw new Error('[CifradoService] Se esperaba un objeto para cifrar.');
    }
    return this.cifrar(objeto);
  }

  /*
    descifrarObjeto(cadena): Descifra y recupera un objeto protegido.

    @param  {string} cadena - Cadena cifrada de un objeto
    @returns {object}         Objeto original recuperado
  */
  descifrarObjeto(cadena) {
    const resultado = this.descifrar(cadena);
    if (typeof resultado !== 'object' || resultado === null) {
      throw new Error('[CifradoService] El resultado descifrado no es un objeto válido.');
    }
    return resultado;
  }

  /*
    esCifradoValido(cadena): Verifica si una cadena tiene el formato
    característico de ncrypt-js (vector.cifrado en hexadecimal).

    @param  {string}  cadena - Cadena a verificar
    @returns {boolean}         true si tiene el formato correcto
  */
  esCifradoValido(cadena) {
    if (typeof cadena !== 'string') return false;
    const partes = cadena.split('.');
    // Formato ncrypt-js: exactamente 2 partes (IV . datos cifrados)
    return partes.length === 2 && partes[0].length > 0 && partes[1].length > 0;
  }

  /*
    cifrarRespuestaAPI(datos): Envuelve datos de respuesta HTTP en un
    contenedor cifrado. Permite que el frontend verifique la integridad
    de los datos recibidos del backend.

    @param  {any}    datos - Datos de la respuesta
    @returns {object}        { cifrado: "<string>", algoritmo: "AES-256-CBC" }
  */
  cifrarRespuestaAPI(datos) {
    return {
      cifrado: this.cifrar(datos),
      algoritmo: this.algoritmoCifrado,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = CifradoService;
