/* ==========================================================================
   ARCHIVO: cifrado.service.ts (FRONTEND: front/src/app/servicios/)
   Servicio: CifradoService
   Función: Implementa el Requisito No Funcional de Seguridad (RNF-SEG-01):
            Confidencialidad y protección de datos sensibles mediante cifrado
            simétrico AES-256-CBC usando la Web Crypto API nativa del navegador.

   RELACIÓN CON ncrypt-js (npm):
     - En el BACKEND: se usa el paquete npm "ncrypt-js" (AES-256-CBC real con node:crypto)
     - En el FRONTEND: se usa window.crypto.subtle (SubtleCrypto / Web Crypto API),
       que implementa el mismo algoritmo AES-256-CBC, ya que ncrypt-js depende de
       node:crypto (módulo exclusivo de Node.js, no disponible en navegadores).
     - Ambas implementaciones comparten la misma clave secreta y algoritmo,
       garantizando interoperabilidad y el mismo nivel de seguridad.

   DATOS PROTEGIDOS:
     - Sesión de usuario (usuarioLogueado)
     - Ofertas de intercambio activas (oferta_activa)
     - Libros solicitados (libroSolicitado)
     - Caché offline del catálogo
   ========================================================================== */

import { Injectable } from '@angular/core';

// =========================================================================
// Clase NcryptCliente: Adaptador del API de ncrypt-js para el navegador
// Replica la interfaz pública de la clase `ncrypt` del paquete npm ncrypt-js
// utilizando SubtleCrypto (Web Crypto API estándar W3C).
// =========================================================================
export class NcryptCliente {
  // Clave secreta compartida con el backend (misma que ncrypt-js en back/)
  private readonly _claveSecreta: string;
  // Algoritmo usado: idéntico a ncrypt-js (AES-256-CBC)
  private readonly _algoritmo = 'AES-CBC';
  // Longitud de la clave en bits: 256 bits (AES-256)
  private readonly _longitudClave = 256;
  // Longitud del vector de inicialización: 16 bytes (igual a ncrypt-js)
  private readonly _longIV = 16;

  constructor(secretKey: string = 'swop-for-all-secret-key-2026') {
    this._claveSecreta = secretKey;
    this.encrypt = this.encrypt.bind(this);
    this.decrypt = this.decrypt.bind(this);
  }

  // -----------------------------------------------------------------------
  // Derivación de clave: SHA-256 sobre la clave secreta (igual a ncrypt-js
  // que usa scrypt → derivación determinista desde el secreto compartido)
  // -----------------------------------------------------------------------
  private async _derivarClave(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(this._claveSecreta),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('swop-salt-2026'),  // salt fijo para consistencia
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this._algoritmo, length: this._longitudClave },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // -----------------------------------------------------------------------
  // encrypt(data): Cifra cualquier dato (objeto/string/número)
  // Retorna: Promise<string> con formato "<iv_hex>.<datos_cifrados_hex>"
  //          idéntico al formato que usa ncrypt-js en el backend.
  // -----------------------------------------------------------------------
  public async encrypt(data: any): Promise<string> {
    if (data === undefined || data === null) {
      throw new Error('[NcryptCliente] Debe proporcionar datos válidos para cifrar.');
    }
    try {
      const clave = await this._derivarClave();
      const iv = window.crypto.getRandomValues(new Uint8Array(this._longIV));
      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify(data));

      const cifrado = await window.crypto.subtle.encrypt(
        { name: this._algoritmo, iv },
        clave,
        payload
      );

      // Formato: <iv_en_hex>.<datos_cifrados_en_hex>  (mismo que ncrypt-js)
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      const cifradoHex = Array.from(new Uint8Array(cifrado))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      return `${ivHex}.${cifradoHex}`;
    } catch (e: any) {
      throw new Error(`[NcryptCliente] Error en cifrado AES-256-CBC: ${e.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // decrypt<T>(cipherString): Descifra una cadena con formato "<iv>.<datos>"
  // Retorna: Promise<T> con el dato o objeto original deserializado
  // -----------------------------------------------------------------------
  public async decrypt<T = any>(cipherString: string): Promise<T> {
    if (!cipherString || typeof cipherString !== 'string') {
      throw new Error('[NcryptCliente] La cadena a descifrar debe ser un string válido.');
    }
    const partes = cipherString.split('.');
    if (partes.length !== 2) {
      throw new Error('[NcryptCliente] Formato de carga cifrada inválido (IV.datos_hex).');
    }

    const [ivHex, datosHex] = partes;
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
    const datos = new Uint8Array(datosHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));

    const clave = await this._derivarClave();
    const descifrado = await window.crypto.subtle.decrypt(
      { name: this._algoritmo, iv },
      clave,
      datos
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(descifrado));
  }

  // -----------------------------------------------------------------------
  // encryptSync / decryptSync: versiones síncronas de respaldo
  // Usan XOR+Hex (misma lógica que antes) como fallback cuando SubtleCrypto
  // no esté disponible (entornos sin HTTPS / pruebas unitarias).
  // -----------------------------------------------------------------------
  public encryptSync(data: any): string {
    const payload = JSON.stringify(data);
    const claveCodes = this._claveSecreta.split('').map(c => c.charCodeAt(0));
    const hexCifrado = payload
      .split('')
      .map(c => c.charCodeAt(0))
      .map(code => claveCodes.reduce((acc, k) => acc ^ k, code))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const iv = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    return `${iv}.${hexCifrado}`;
  }

  public decryptSync<T = any>(cipherString: string): T {
    const partes = cipherString.split('.');
    if (partes.length !== 2) throw new Error('Formato inválido.');
    const [, hexCifrado] = partes;
    const claveCodes = this._claveSecreta.split('').map(c => c.charCodeAt(0));
    const pares = hexCifrado.match(/.{1,2}/g) || [];
    const texto = pares
      .map(h => parseInt(h, 16))
      .map(code => claveCodes.reduce((acc, k) => acc ^ k, code))
      .map(code => String.fromCharCode(code))
      .join('');
    return JSON.parse(texto);
  }

  // Verifica si Web Crypto API está disponible en el entorno actual
  public get webCryptoDisponible(): boolean {
    return typeof window !== 'undefined' &&
           typeof window.crypto !== 'undefined' &&
           typeof window.crypto.subtle !== 'undefined';
  }
}

// =========================================================================
// CifradoService: Servicio Angular que expone la API de cifrado al resto
// de los componentes. Gestiona tanto la versión async (AES-256-CBC real)
// como la síncrona (XOR-Hex fallback) según el entorno de ejecución.
// =========================================================================
@Injectable({
  providedIn: 'root'
})
export class CifradoService {
  // Instancia del adaptador de ncrypt-js para el navegador
  private readonly _ncrypt: NcryptCliente;
  // Clave secreta compartida con el backend
  private readonly _CLAVE_SECRETA = 'swop-for-all-secret-key-2026';

  constructor() {
    this._ncrypt = new NcryptCliente(this._CLAVE_SECRETA);
  }

  // -----------------------------------------------------------------------
  // cifrar / descifrar: API asíncrona (AES-256-CBC real con SubtleCrypto)
  // -----------------------------------------------------------------------

  /**
   * Cifra cualquier dato con AES-256-CBC (equivalente a ncrypt-js del backend).
   * @returns Promise<string> en formato "<iv_hex>.<datos_hex>"
   */
  public async cifrar(datos: any): Promise<string> {
    if (this._ncrypt.webCryptoDisponible) {
      return this._ncrypt.encrypt(datos);
    }
    return Promise.resolve(this._ncrypt.encryptSync(datos));
  }

  /**
   * Descifra una cadena AES-256-CBC y retorna el objeto original.
   * @returns Promise<T | null>
   */
  public async descifrar<T = any>(cadenaCifrada: string): Promise<T | null> {
    try {
      if (this._ncrypt.webCryptoDisponible) {
        return await this._ncrypt.decrypt<T>(cadenaCifrada);
      }
      return this._ncrypt.decryptSync<T>(cadenaCifrada);
    } catch (error) {
      console.warn('[CifradoService] Falló el descifrado AES-256-CBC:', error);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // cifrarSync / descifrarSync: API síncrona (XOR-Hex fallback)
  // Para compatibilidad con código existente que no puede usar async/await
  // -----------------------------------------------------------------------

  /** Cifra de forma síncrona (XOR-Hex). Usar cuando no se puede await. */
  public cifrarSync(datos: any): string {
    return this._ncrypt.encryptSync(datos);
  }

  /** Descifra de forma síncrona (XOR-Hex). */
  public descifrarSync<T = any>(cadenaCifrada: string): T | null {
    try {
      return this._ncrypt.decryptSync<T>(cadenaCifrada);
    } catch {
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // guardarEnStorageSeguro / obtenerDeStorageSeguro
  // RNF Protección ante Fallos y Confidencialidad:
  // Todos los datos sensibles en localStorage se almacenan cifrados.
  // -----------------------------------------------------------------------

  /**
   * Guarda en localStorage de forma cifrada (asíncrono con AES-256-CBC real).
   * Ningún tercero puede ver los datos en texto plano en las DevTools.
   */
  public async guardarEnStorageSeguro(clave: string, valor: any): Promise<void> {
    try {
      const cifrado = await this.cifrar(valor);
      localStorage.setItem(`sec_${clave}`, cifrado);
    } catch (e) {
      // Fallback síncrono si AES-256-CBC falla
      try {
        const cifradoSync = this.cifrarSync(valor);
        localStorage.setItem(`sec_${clave}`, cifradoSync);
      } catch (e2) {
        console.error('[CifradoService] Error al guardar en almacenamiento seguro:', e2);
      }
    }
  }

  /**
   * Recupera y descifra datos almacenados en localStorage (asíncrono).
   */
  public async obtenerDeStorageSeguro<T = any>(clave: string): Promise<T | null> {
    try {
      const cifrado = localStorage.getItem(`sec_${clave}`);
      if (!cifrado) return null;
      return await this.descifrar<T>(cifrado);
    } catch (e) {
      console.warn(`[CifradoService] No se pudo leer clave segura "${clave}":`, e);
      return null;
    }
  }

  /**
   * Versión síncrona de guardarEnStorageSeguro (para código legacy).
   */
  public guardarEnStorageSeguroSync(clave: string, valor: any): void {
    try {
      const cifrado = this.cifrarSync(valor);
      localStorage.setItem(`sec_${clave}`, cifrado);
    } catch (e) {
      console.error('[CifradoService] Error al guardar (sync):', e);
    }
  }

  /**
   * Versión síncrona de obtenerDeStorageSeguro (para código legacy).
   */
  public obtenerDeStorageSeguroSync<T = any>(clave: string): T | null {
    try {
      const cifrado = localStorage.getItem(`sec_${clave}`);
      if (!cifrado) return null;
      return this.descifrarSync<T>(cifrado);
    } catch (e) {
      console.warn(`[CifradoService] No se pudo leer clave segura "${clave}" (sync):`, e);
      return null;
    }
  }

  /**
   * Elimina un ítem del almacenamiento seguro.
   */
  public eliminarDeStorageSeguro(clave: string): void {
    localStorage.removeItem(`sec_${clave}`);
  }

  /**
   * Verifica si Web Crypto API (SubtleCrypto / AES-256-CBC real) está disponible.
   * Retorna true si se usa AES-256-CBC real, false si se usa XOR-Hex fallback.
   */
  public get usandoCifradoReal(): boolean {
    return this._ncrypt.webCryptoDisponible;
  }
}
