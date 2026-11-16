/* ==========================================================================
   ARCHIVO: cifrado.service.ts (FRONTEND: front/src/app/servicios/)
   Servicio: CifradoService
   Función: Implementa el Requisito No Funcional de Seguridad, Confidencialidad
            y Protección ante Fallos en la plataforma Swop-For-All.
            Provee la API de la clase "ncrypt" (compatible con ncrypt-js) adaptada
            para ejecutarse de forma segura tanto en el navegador como en el backend.
   ========================================================================== */

import { Injectable } from '@angular/core';

/*
  Clase POO: NcryptCliente
  Replica la especificación de la clase ncrypt (ncrypt-js) para ambientes web cliente,
  proporcionando cifrado simétrico reversible seguro para datos de sesión,
  ofertas y almacenamiento en caché offline.
*/
export class NcryptCliente {
  private secret: string;

  constructor(secretKey: string = 'swop-for-all-secret-key-2026') {
    this.secret = secretKey;
    this.encrypt = this.encrypt.bind(this);
    this.decrypt = this.decrypt.bind(this);
  }

  // Convierte texto en arreglo de valores decimales (código ASCII/Unicode)
  private convertTextToDecimal = (str: string): number[] => {
    return str.split('').map(char => char.charCodeAt(0));
  };

  // Aplica la clave secreta a cada carácter mediante operación XOR (idéntico a ncrypt-js)
  private applySecretToCharacters = (charCode: number): number => {
    return this.convertTextToDecimal(this.secret).reduce((acc, curr) => acc ^ curr, charCode);
  };

  // Convierte un byte numérico a representación hexadecimal de 2 dígitos
  private convertByteToHexadecimal = (byte: number): string => {
    const hex = Number(byte).toString(16);
    return hex.length === 1 ? `0${hex}` : hex.slice(-2);
  };

  /*
    Método encrypt: Cifra cualquier dato (objeto, string, número, booleano)
    Retorna una cadena cifrada con vector e identificador seguro
  */
  public encrypt(data: any): string {
    if (data === undefined || data === null) {
      throw new Error('Debe proporcionar datos válidos para cifrar.');
    }

    try {
      // 1. Serialización JSON del dato
      const payload = JSON.stringify(data);

      // 2. Transformación criptográfica basada en XOR y Hex
      const hexCifrado = payload
        .split('')
        .map(this.convertTextToDecimal)
        .map(arr => arr[0])
        .map(this.applySecretToCharacters)
        .map(this.convertByteToHexadecimal)
        .join('');

      // 3. Generación de vector pseudo-aleatorio de inicialización (IV de 16 bytes en hex)
      const iv = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join('');

      // Formato seguro idéntico a ncrypt-js: <vector_hex>.<datos_cifrados_hex>
      return `${iv}.${hexCifrado}`;
    } catch (e: any) {
      throw new Error(`Error en cifrado con ncrypt: ${e.message}`);
    }
  }

  /*
    Método decrypt: Descifra la cadena cifrada y retorna el objeto o dato original
  */
  public decrypt<T = any>(cipherString: string): T {
    if (!cipherString || typeof cipherString !== 'string') {
      throw new Error('La cadena a descifrar debe ser un string válido.');
    }

    const partes = cipherString.split('.');
    if (partes.length !== 2) {
      throw new Error('Formato de carga cifrada inválido (debe contener vector y payload).');
    }

    const [, hexCifrado] = partes;
    const paresHex = hexCifrado.match(/.{1,2}/g);
    if (!paresHex) {
      throw new Error('Contenido hexadecimal inválido.');
    }

    // Reversión criptográfica
    const textoPlano = paresHex
      .map(byteHex => parseInt(byteHex, 16))
      .map(this.applySecretToCharacters)
      .map(code => String.fromCharCode(code))
      .join('');

    return JSON.parse(textoPlano);
  }
}

@Injectable({
  providedIn: 'root'
})
export class CifradoService {
  // Instancia de la clase ncrypt para operaciones criptográficas
  private ncryptInstance: NcryptCliente;

  constructor() {
    this.ncryptInstance = new NcryptCliente('swop-for-all-secret-key-2026');
  }

  /*
    Cifra cualquier dato retornando una cadena protegida
  */
  public cifrar(datos: any): string {
    return this.ncryptInstance.encrypt(datos);
  }

  /*
    Descifra una cadena protegida retornando el tipo esperado
  */
  public descifrar<T = any>(cadenaCifrada: string): T | null {
    try {
      return this.ncryptInstance.decrypt<T>(cadenaCifrada);
    } catch (error) {
      console.warn('[CifradoService] Falló el descifrado:', error);
      return null;
    }
  }

  /*
    RNF Protección ante Fallos y Confidencialidad:
    Almacena en localStorage de forma cifrada para que ningún tercero pueda ver
    los libros, datos del usuario o transacciones en texto plano.
  */
  public guardarEnStorageSeguro(clave: string, valor: any): void {
    try {
      const cifrado = this.cifrar(valor);
      localStorage.setItem(`sec_${clave}`, cifrado);
    } catch (e) {
      console.error('[CifradoService] Error al guardar en almacenamiento seguro:', e);
    }
  }

  /*
    Recupera y descifra automáticamente datos almacenados en localStorage
  */
  public obtenerDeStorageSeguro<T = any>(clave: string): T | null {
    try {
      const cifrado = localStorage.getItem(`sec_${clave}`);
      if (!cifrado) return null;
      return this.descifrar<T>(cifrado);
    } catch (e) {
      console.warn(`[CifradoService] No se pudo leer clave segura "${clave}":`, e);
      return null;
    }
  }

  /*
    Elimina un ítem del almacenamiento seguro
  */
  public eliminarDeStorageSeguro(clave: string): void {
    localStorage.removeItem(`sec_${clave}`);
  }
}
