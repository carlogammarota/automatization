const axios = require('axios');

const zoneId = '22ba6192a10c766dd77527c7a101ad35'; // Reemplaza con tu ID de zona
const apiKey = '9ed98c1d2991f51503bd165e5d61924cae9d4';
const authEmail = 'carlo.gammarota@gmail.com';


const crearSubdominio = async (subdominio) => {

// Datos del registro DNS que deseas agregar
const dnsRecordData = {
  type: 'A', // Tipo de registro DNS (por ejemplo, A, CNAME, MX, etc.)
  name: 'subdominioprobando', // Nombre del subdominio
  content: '64.227.76.217', // Contenido del registro (por ejemplo, una dirección IP)
  ttl: 1, // Tiempo de vida en segundos
  proxied: true, // Si deseas que la solicitud se enruté a través de Cloudflare (true/false)
};

const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

// Configuración de la solicitud
const config = {
  method: 'post', // Utiliza el método POST para crear el registro DNS
  url: apiUrl,
  headers: {
    'X-Auth-Key': apiKey,
    'X-Auth-Email': authEmail,
    'Content-Type': 'application/json',
  },
  data: dnsRecordData,
};

// Realizar la solicitud POST para agregar el registro DNS
axios(config)
  .then(response => {
    console.log('Registro DNS agregado con éxito:', response.data);
  })
  .catch(error => {
    console.error('Error al agregar el registro DNS:', error.response.data);
  });
}

  export default crearSubdominio;