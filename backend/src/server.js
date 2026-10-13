const { assertConfig } = require('./config');

assertConfig();

const app = require('./app');
const { config } = require('./config');

app.listen(config.port, () => {
  console.log(`Servidor iniciado en http://localhost:${config.port}`);
});
