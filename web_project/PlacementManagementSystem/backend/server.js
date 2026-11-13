require('dotenv').config();
const app = require('./app');
const { initDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`=====================================================================`);
    console.log(` Placement Drive & Candidate Approval Management System Server Active`);
    console.log(` Port: http://localhost:${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=====================================================================`);
  });
}

startServer();
