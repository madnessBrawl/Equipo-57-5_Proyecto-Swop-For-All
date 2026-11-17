// front/src/app/modelos/intercambio.model.ts
export class Libro {
  constructor(
    public id: string,
    public titulo: string,
    public autor: string,
    public disponible: boolean = true,
    public portadaUrl: string = '',
    public descripcion: string = '',
    public isbn: string = '',
    public categoria: string = 'General'
  ) {}
}

export class OfertaIntercambio {
  constructor(
    public idIntercambio: string,
    public usuarioEmisor: string,
    public usuarioReceptor: string,
    public librosOfrecidos: Libro[],
    public librosSolicitados: Libro[],
    public estado: string,
    public mensajes: any[] = [],
    public confirmaciones: string[] = [],
    public fechaCreacion: string = new Date().toISOString(),
    public fechaModificacion: string = fechaCreacion
  ) {}
}
