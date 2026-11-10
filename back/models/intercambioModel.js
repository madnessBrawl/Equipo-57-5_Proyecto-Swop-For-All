    // back/models/intercambioModel.js
class OfertaIntercambio {
    constructor(idIntercambio, usuarioEmisor, usuarioReceptor, librosOfrecidos, librosSolicitados, estado) {
        this.idIntercambio = idIntercambio;
        this.usuarioEmisor = usuarioEmisor;
        this.usuarioReceptor = usuarioReceptor;
        this.librosOfrecidos = librosOfrecidos;
        this.librosSolicitados = librosSolicitados;
        this.estado = estado;
    }
}
module.exports = OfertaIntercambio;