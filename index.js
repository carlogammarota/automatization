const express = require("express");
const { exec } = require("child_process");
const Docker = require("dockerode");
const bodyParser = require("body-parser");
const app = express();
const port = 2323;
const path = require("path");
const fs = require("fs");
const axios = require("axios");
// const crearSubdominio = require('./crearSubdominio');

app.use(express.json());
app.use(bodyParser.json());

function clonarArchivoDominioDefault(subdomain, port) {
  const archivoDefault = "default.conf"; // Nombre del archivo default
  const nuevoNombre = `${subdomain}.armortemplate.site`; // Nombre del archivo clonado
  const rutaDestino = `/etc/nginx/sites-enabled/${nuevoNombre}`; // Ruta de destino

  // Leer el contenido del archivo default
  fs.readFile(archivoDefault, "utf8", (error, data) => {
    if (error) {
      console.error(`Error al leer el archivo ${archivoDefault}: ${error}`);
      return;
    }

    // Reemplazar "default" y "port" con los valores proporcionados
    const nuevoContenido = data
      .replace(/default/g, subdomain)
      .replace(/port/g, port);

    // Escribir el nuevo archivo con el nombre personalizado
    fs.writeFile(nuevoNombre, nuevoContenido, "utf8", (error) => {
      if (error) {
        console.error(`Error al escribir el archivo ${nuevoNombre}: ${error}`);
        return res.status(500).send("Error al escribir el archivo");
      } else {
        console.log(`Archivo ${nuevoNombre} creado con éxito.`);

        // Usar sudo para mover el archivo a /etc/nginx/sites-enabled
        exec(
          `sudo mv ${nuevoNombre} ${rutaDestino}`,
          (error, stdout, stderr) => {
            if (error) {
              
              console.error(
                `Error al mover el archivo a ${rutaDestino}: ${error}`
              );
              return res.status(500).send("Error al mover el archivo");
            } else {
              console.log(`Archivo movido a ${rutaDestino} con éxito.`);
            }
          }
        );
      }
    });
  });
}

function recargarNginx() {
  const comando = "sudo systemctl reload nginx";

  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al ejecutar el comando: ${error}`);
      return res.status(500).send("Error al hacer reload nginx");
    }

    console.log(`Resultado: ${stdout}`);
    console.error(`Errores: ${stderr}`);
  });
}

function crearSubdominio(subdomain, port) {
  const zoneId = "22ba6192a10c766dd77527c7a101ad35"; // Reemplaza con tu ID de zona
  const apiKey = "9ed98c1d2991f51503bd165e5d61924cae9d4";
  const authEmail = "carlo.gammarota@gmail.com";

  // Datos del registro DNS que deseas agregar
  const dnsRecordData = {
    type: "A", // Tipo de registro DNS (por ejemplo, A, CNAME, MX, etc.)
    name: subdomain, // Nombre del subdominio
    content: "64.227.76.217", // Contenido del registro (por ejemplo, una dirección IP)
    ttl: 1, // Tiempo de vida en segundos
    proxied: true, // Si deseas que la solicitud se enruté a través de Cloudflare (true/false)
  };

  const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

  // Configuración de la solicitud
  const config = {
    method: "post", // Utiliza el método POST para crear el registro DNS
    url: apiUrl,
    headers: {
      "X-Auth-Key": apiKey,
      "X-Auth-Email": authEmail,
      "Content-Type": "application/json",
    },
    data: dnsRecordData,
  };

  // Realizar la solicitud POST para agregar el registro DNS
  axios(config)
    .then((response) => {
      console.log("Registro DNS agregado con éxito:", response.data);
      
    })
    .catch((error) => {
      
      console.error(
        "Error al agregar el registro DNS:",
        error.response.data
      );
      return res.status(500).send("Error al agregar el registro DNS (CloudFlare)");
    });
}

app.post("/build-and-create", (req, res) => {
  let { hostPort, containerName, subdomain } = req.body;

  const buildCommand = `docker run -d --name ${containerName} -p ${hostPort}:2222 mi-app:latest`;

  exec(buildCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("Error al construir la imagen Docker:", error);
      res.status(500).send("Error al construir la imagen Docker");
    } else {
      console.log("Imagen Docker construida con éxito");

      //creamos subdominio
      clonarArchivoDominioDefault(subdomain, hostPort);
      crearSubdominio(subdomain, hostPort);

      // Llama a la función para recargar Nginx
      recargarNginx();
      return res.send("Imagen Docker construida con éxito");
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});
