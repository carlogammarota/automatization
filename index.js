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
  // ...
}

async function recargarNginx(res) {
  // ...
}

async function crearSubdominioCloudFlare(subdomain, res) {
  // ...

  try {
    // ...

    return true; // Operación exitosa
  } catch (error) {
    console.error("Error al agregar el registro DNS:", error);
    res.status(500).send('Error al agregar el registro DNS (CloudFlare)');
    return false; // Operación fallida
  }
}

app.post("/build-and-create", checkMasterPassword, async (req, res) => {
  let { hostPort, subdomain } = req.body.data;
  const containerName = subdomain;
  const buildCommand = `docker run -d --name ${containerName} -p ${hostPort}:2222 mi-app:latest`;

  try {
    const cloudFlareSuccess = await crearSubdominioCloudFlare(subdomain, res);

    if (!cloudFlareSuccess) {
      console.error("Error al crear subdominio en Cloudflare. Deteniendo el proceso.");
      res.status(500).send("Error al crear subdominio en Cloudflare.");
      return;
    }

    const clonarArchivoSuccess = await clonarArchivoDominioDefault(subdomain, hostPort, res);
    const nginxReloadSuccess = await recargarNginx(res);

    if (clonarArchivoSuccess && nginxReloadSuccess) {
      console.log("Imagen Docker construida con éxito");
      res.send("Imagen Docker construida con éxito");
    } else {
      console.error("Error general: Al menos una operación ha fallado");
      res.status(500).send("Error general: Al menos una operación ha fallado");
    }
  } catch (error) {
    console.error("Error general:", error);
    res.status(500).send("Error general: " + error.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});
