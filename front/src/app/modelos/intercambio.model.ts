// front/src/app/modelos/intercambio.model.ts
export class Libro {
  constructor(public id: string, public titulo: string, public autor: string, public disponible: boolean) {}
}

export class OfertaIntercambio {
  constructor(
    public idIntercambio: string,
    public usuarioEmisor: string,
    public usuarioReceptor: string,
    public librosOfrecidos: Libro[],
    public librosSolicitados: Libro[],
    public estado: string
  ) {}
}