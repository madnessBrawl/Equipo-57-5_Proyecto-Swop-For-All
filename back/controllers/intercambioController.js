/ back/controllers/intercambioController.js
const ofertasDB = new Map(); // Simulación de base de datos en memoria

exports.modificarOferta = (req, res) => {
    // Lógica para actualizar la oferta con los nuevos libros del inventario
    const { idIntercambio, librosOfrecidos, librosSolicitados } = req.body;

    const ofertaActualizada = {
        idIntercambio,
        librosOfrecidos,
        librosSolicitados,
        estado: 'Modificada Pendiente de Aceptación',
        fechaModificacion: new Date()
    };

    ofertasDB.set(idIntercambio, ofertaActualizada);
    res.status(200).json({ message: 'Oferta modificada con éxito', oferta: ofertaActualizada });
};