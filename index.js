const express = require("express");
const { exec } = require("child_process");
const Docker = require("dockerode");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const axios = require("axios");

const app = express();
const port = 2323;

app.use(express.json());
app.use(bodyParser.json());

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error(err); // Imprime el error en la consola
  res.status(500).send('Error interno del servidor'); // Responde con un mensaje de error
});

// Contraseña maestra
const masterPassword = 'contraseña_maestra';

// Middleware personalizado para verificar la contraseña maestra
function checkMasterPassword(req, res, next) {
  const password = req.body.password;

  if (password === masterPassword) {
    // La contraseña es correcta, pasa al siguiente middleware
    next();
  } else {
    // La contraseña es incorrecta, devuelve un error 401 (No autorizado)
    res.status(401).json({ message: 'Contraseña incorrecta' });
  }
}

async function clonarArchivoDominioDefault(subdomain, port, res) {
  const archivoDefault = "default.conf";
  const nuevoNombre = `${subdomain}.armortemplate.site`;
  const rutaDestino = `/etc/nginx/sites-enabled/${nuevoNombre}`;

  try {
    const data = await fs.readFile(archivoDefault, "utf8");
    const nuevoContenido = data
      .replace(/default/g, subdomain)
      .replace(/port/g, port);

    await fs.writeFile(nuevoNombre, nuevoContenido, "utf8");
    console.log(`Archivo ${nuevoNombre} creado con éxito.`);

    await exec(`sudo mv ${nuevoNombre} ${rutaDestino}`);
    console.log(`Archivo movido a ${rutaDestino} con éxito.`);
  } catch (error) {
    console.error(`Error al clonar el archivo: ${error}`);
    res.status(500).send('Error al clonar el archivo');
  }
}

async function recargarNginx(res) {
  const comando = "sudo systemctl reload nginx";

  try {
    const { stdout, stderr } = await exec(comando);
    console.log(`Resultado: ${stdout}`);
    console.error(`Errores: ${stderr}`);
  } catch (error) {
    console.error(`Error al recargar Nginx: ${error}`);
    res.status(500).send('Error al recargar Nginx');
  }
}

async function crearSubdominioCloudFlare(subdomain, res) {
  const zoneId = "22ba6192a10c766dd77527c7a101ad35";
  const apiKey = "9ed98c1d2991f51503bd165e5d61924cae9d4";
  const authEmail = "carlo.gammarota@gmail.com";
  const dnsRecordData = {
    type: "A",
    name: subdomain,
    content: "64.227.76.217",
    ttl: 1,
    proxied: true,
  };

  const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

  const config = {
    method: "post",
    url: apiUrl,
    headers: {
      "X-Auth-Key": apiKey,
      "X-Auth-Email": authEmail,
      "Content-Type": "application/json",
    },
    data: dnsRecordData,
  };

  try {
    const response = await axios(config);
    console.log("Registro DNS agregado con éxito:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error al agregar el registro DNS:", error);
    res.status(500).send('Error al agregar el registro DNS (CloudFlare)');
  }
}

app.post("/build-and-create", checkMasterPassword, async (req, res) => {
  let { hostPort, subdomain } = req.body.data;
  const containerName = subdomain;
  const buildCommand = `docker run -d --name ${containerName} -p ${hostPort}:2222 mi-app:latest`;

  try {
    await crearSubdominioCloudFlare(subdomain, res);
    await clonarArchivoDominioDefault(subdomain, hostPort, res);
    await exec(buildCommand);
    console.log("Imagen Docker construida con éxito");
    await recargarNginx(res);
    res.send("Imagen Docker construida con éxito");
  } catch (error) {
    console.error("Error general:", error);
    res.status(500).send("Error general: " + error.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});
