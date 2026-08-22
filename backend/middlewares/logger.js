/*=========================================================
=
=            MARKETPLACE BACKEND
=
=            BACKEND 10
=
=            middlewares/logger.js
=
=========================================================*/

const fs = require("fs");

const path = require("path");

/*=========================================
    Dossier logs
=========================================*/

const logDirectory = path.join(

    __dirname,

    "../logs"

);

if (!fs.existsSync(logDirectory)) {

    fs.mkdirSync(

        logDirectory,

        {

            recursive: true

        }

    );

}

/*=========================================
    Nom du fichier
=========================================*/

function logFile() {

    const today = new Date()

        .toISOString()

        .split("T")[0];

    return path.join(

        logDirectory,

        `${today}.log`

    );

}

/*=========================================
    Écriture
=========================================*/

function write(level, message) {

    const line =

        `[${new Date().toISOString()}] ` +

        `[${level}] ` +

        `${message}\n`;

    fs.appendFile(

        logFile(),

        line,

        err => {

            if (err)

                console.error(err);

        }

    );

}

/*=========================================
    Middleware HTTP
=========================================*/

function logger(

    req,

    res,

    next

) {

    const start = Date.now();

    res.on("finish", () => {

        const duration =

            Date.now() -

            start;

        write(

            "HTTP",

            `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`

        );

    });

    next();

}

/*=========================================
    Logs divers
=========================================*/

function info(message) {

    write(

        "INFO",

        message

    );

}

function warning(message) {

    write(

        "WARNING",

        message

    );

}

function error(message) {

    write(

        "ERROR",

        message

    );

}

function security(message) {

    write(

        "SECURITY",

        message

    );

}

function payment(message) {

    write(

        "PAYMENT",

        message

    );

}

function order(message) {

    write(

        "ORDER",

        message

    );

}

module.exports = {

    logger,

    info,

    warning,

    error,

    security,

    payment,

    order

};

console.log("BACKEND 10 chargé.");