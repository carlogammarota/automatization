const express = require('express');
const { exec } = require('child_process');
const Docker = require('dockerode');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const path = require('path');
const fs = require('fs');
const crearSubdominio = require('./crearSubdominio');

app.use(express.json());
app.use(bodyParser.json());


function clonarArchivoDefault(subdomain, port) {
  const archivoDefault = 'default.conf'; // Nombre del archivo default
  const nuevoNombre = `${subdomain}_${port}.site`; // Nombre del archivo clonado
  const rutaDestino = `/etc/nginx/sites-enabled/${nuevoNombre}`; // Ruta de destino

  // Leer el contenido del archivo default
  fs.readFile(archivoDefault, 'utf8', (error, data) => {
    if (error) {
      console.error(`Error al leer el archivo ${archivoDefault}: ${error}`);
      return;
    }

    // Reemplazar "default" y "port" con los valores proporcionados
    const nuevoContenido = data.replace(/default/g, subdomain).replace(/port/g, port);

    // Escribir el nuevo archivo con el nombre personalizado
    fs.writeFile(nuevoNombre, nuevoContenido, 'utf8', (error) => {
      if (error) {
        console.error(`Error al escribir el archivo ${nuevoNombre}: ${error}`);
      } else {
        console.log(`Archivo ${nuevoNombre} creado con éxito.`);
        
        // Usar sudo para mover el archivo a /etc/nginx/sites-enabled
        exec(`sudo mv ${nuevoNombre} ${rutaDestino}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error al mover el archivo a ${rutaDestino}: ${error}`);
          } else {
            console.log(`Archivo movido a ${rutaDestino} con éxito.`);
          }
        });
      }
    });
  });
}

app.post('/build-and-create', (req, res) => {
  let { hostPort, containerName, subdomain } = req.body;
  console.log(req.body);

  // Definir las variables necesarias
  const imageName = 'mi-contenedor-con-docker-compose:latest'; // Reemplaza con el nombre de tu imagen
  // const exposedPort = '1313'; // Reemplaza con el puerto que deseas exponer

  // Comando para construir la imagen Docker desde el Dockerfile
  const buildCommand = `docker run -d --name ${containerName} -p ${hostPort}:2222 mi-contenedor-con-docker-compose:latest`;

  exec(buildCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('Error al construir la imagen Docker:', error);
      res.status(500).send('Error al construir la imagen Docker');
    } else {
      console.log('Imagen Docker construida con éxito');

      //aca hay que crear el subdominio 
      // Ejemplo de uso:
      clonarArchivoDefault(subdomain, hostPort);

      return res.send('Imagen Docker construida con éxito');

      // Una vez construida la imagen, crear y ejecutar el contenedor
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });

      const containerConfig = {
        Image: imageName,
        name: containerName,
        ExposedPorts: {
          [`${exposedPort}/tcp`]: {}, // Exponer el puerto específico
        },
        HostConfig: {
          PortBindings: {
            [`${exposedPort}/tcp`]: [{ HostPort: hostPort }], // Mapeo del puerto en el host
          },
        },
      };

      // docker.createContainer(containerConfig, (createError, container) => {
      //   if (createError) {
      //     console.error('Error al crear el contenedor Docker:', createError);
      //     res.status(500).send('Error al crear el contenedor Docker');
      //   } else {
      //     container.start((startError) => {
      //       if (startError) {
      //         console.error('Error al iniciar el contenedor Docker:', startError);
      //         res.status(500).send('Error al iniciar el contenedor Docker');
      //       } else {
      //         console.log('Contenedor Docker iniciado con éxito');
      //         res.send('Contenedor Docker iniciado con éxito');
      //       }
      //     });
      //   }
      // });
    }
  });
});







// Ejemplo de uso:
// clonarArchivoDefault('empresa', '8989');

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});
