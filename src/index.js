const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const path = require("node:path");


//Defino una constante para el puerto de escucha 3000
const PORT = 3000;

const reservas = [
    {
        id: 1,
        estudiante: "Juan Pérez",
        email: "juan@gmail.com",
        sala: "Sala Norte",
        fecha: "05/09/2026",
        turno: "Mañana",
        personas: 2
    },
    {
        id: 2,
        estudiante: "María López",
        email: "maria@gmail.com",
        sala: "Sala Sur",
        fecha: "26/09/2026",
        turno: "Tarde",
        personas: 4
    },
    {
        id: 3,
        estudiante: "Carlos Gómez",
        email: "carlos@gmail.com",
        sala: "Sala Multimedia",
        fecha: "27/09/2026",
        turno: "Noche",
        personas: 3
    },
    {
        id: 4,
        estudiante: "Ana Rodríguez",
        email: "ana@gmail.com",
        sala: "Sala Norte",
        fecha: "28/09/2026",
        turno: "Mañana",
        personas: 1
    }
];

/*-----------------------------------------CREACION DE 3 MIDDLEWARE--------------------------------------------*/
//Para ver todas la solicitudes del servidor
let numeroDeSolicitud = 0;

//MIDDLEWARE: Indentifica la solicitud HTTP
function identificarSolicitud(req, res, next) {

    numeroDeSolicitud += 1;
    res.locals.solicitudId = `SOL-${String(numeroDeSolicitud).padStart(4, "0")}`;
    console.log(`identificarSolicitud : [${res.locals.solicitudId}] ${req.method} ${req.originalUrl}`);
    next();
}

//MIDDLEWARE: Mide la duracion de la solicitud operacion
function medirDuracion(req, res, next) {

    const inicio = process.hrtime.bigint();

    res.on("finish", () => {
        const fin = process.hrtime.bigint();
        const milisegundos = Number(fin - inicio) / 1_000_000;

        console.log( ` duración: [${res.locals.solicitudId}] ${req.method} ${req.originalUrl} ` +
                     `${res.statusCode} ${milisegundos.toFixed(2)} ms`,);
    });

    next();
}

//MIDDLEWARE: Indica en que seccion se esta procesando la solicitud
function prepararAreaReservas( req, res, next) {

    res.locals.seccion = "Reservas de salas de estudio";
    console.log( 'Sección: ' + res.locals.seccion );
    next();
}

//MIDDLEWARE: Comprueba que los datos de la reservas sean correctos antes de continuar
function validarReservas( req, res, next ) {
    
    const estudiante = String(req.body.estudiante ?? "").trim();
    const email = String(req.body.email ?? "").trim();
    const sala = String(req.body.sala ?? "").trim();
    const fecha = String(req.body.fecha ?? "").trim();
    const turno = String(req.body.turno ?? "").trim();
    const personas = Number(req.body.personas);
    
    const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
    const turnos = ["Mañana", "Tarde", "Noche"];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!estudiante || 
        !email ||
        !emailRegex.test(email) ||
        !salasPermitidas.includes(sala) ||
        !fecha ||
        !turnos.includes(turno) ||
        !Number.isInteger(personas) ||
        personas < 1 ||
        personas > 6 ){
        
            return res.status(400).render("reservas/nueva", {
                titulo: "Nueva reservas",
                error: "Completá todos los campos con valores válidos y seleccioná los valores permitidos.",
                valores: req.body,
        });
    }
    req.reservasValidada = { estudiante, email, sala, fecha, turno, personas };
    next();
}

//Función para crear una reserva nueva
function crearReservas(req, res) {

    const ultimoId = reservas.reduce(
    
    (mayorId, reserva) => Math.max(mayorId, reserva.id), 0, );
    
    reservas.push({ id: ultimoId + 1, ...req.reservasValidada });

    res.redirect("/reservas");
 }


//Funcion principal de inicio
async function main() {
   
    //Crear una instancia de la aplicación express
    const app = express();

    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "..", "views"));
    app.set("layout", "layouts/main");
    app.use(morgan("dev"));
    app.use(identificarSolicitud);
    app.use(medirDuracion);
    app.use(expressLayouts);
    app.use(express.static(path.join(__dirname, "..", "public")));
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());

    app.get("/", (req, res) => {

        res.status(200).render("inicio", { titulo: "Reservas de salas de estudio" });
    });

    app.get("/estado", (req, res) =>{

        res.status(200).json(reservas);
    });

    //Definimos el enrutador
    const reservasRouter = express.Router();
    reservasRouter.use(prepararAreaReservas);

    reservasRouter.get("/", (req, res) => {

        res.status(200).render("reservas/lista", {
            titulo: "Lista de reservas",
            reservas,
        });
    });

    reservasRouter.get("/nueva", (req, res) => {

        res.render("reservas/nueva", {
            titulo: "Nueva Reserva",
            error: null,
            valores: {},
        });
    });

    reservasRouter.get("/:id", (req, res) => {

        const id = Number(req.params.id);
        const reserva = reservas.find((elemento) => elemento.id === id);

        if (!reserva) {
            return res.status(404).render("no-encontrado", {
                titulo: "Reserva no encontrada",
                mensaje: "La dirección solicitada no existe.",
            });
        }
        res.render("reservas/detalle", {
            titulo: reserva.estudiante,
            reserva,
        });
    });

    reservasRouter.post("/", validarReservas, crearReservas);
    app.use("/reservas", reservasRouter);

    app.use((req, res) => {

        res.status(404).render("no-encontrado", {
            titulo: "Página no encontrada",
            mensaje: "La dirección solicitada no existe.",
        });
    });
                       
    //Servidor escuchando listo para las peticiones
    app.listen(PORT, ()=>{
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
}
main().catch((error) => {
    console.error("No se pudo iniciar la aplicación:", error);
    process.exitCode = 1;
});
