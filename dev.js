const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = __dirname;
const backendDirectory = path.join(root, 'back');
const frontendDirectory = path.join(root, 'front');
const frontendCli = path.join(frontendDirectory, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
const backendPort = 3000;
const children = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

function monitor(child, label) {
  children.push(child);
  child.on('error', error => {
    console.error(`[${label}] No se pudo iniciar: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${label}] terminó inesperadamente (código ${code}, señal ${signal || 'ninguna'}).`);
      stop(code || 1);
    }
  });
}

function esperarBackend(child) {
  return new Promise((resolve, reject) => {
    let intentos = 0;

    function comprobarPuerto() {
      if (stopping) {
        reject(new Error('Inicio cancelado.'));
        return;
      }
      if (child.exitCode !== null) {
        reject(new Error('El backend terminó antes de escuchar en el puerto 3000.'));
        return;
      }

      const socket = net.createConnection({ host: '127.0.0.1', port: backendPort });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        intentos += 1;
        if (intentos >= 40) {
          reject(new Error('El backend no respondió en el puerto 3000.'));
          return;
        }
        setTimeout(comprobarPuerto, 250);
      });
    }

    comprobarPuerto();
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

const backend = spawn(process.execPath, ['server.js'], {
  cwd: backendDirectory,
  env: { ...process.env, PORT: String(backendPort) },
  stdio: 'inherit'
});
monitor(backend, 'Backend');

esperarBackend(backend)
  .then(() => {
    if (stopping) return;
    const frontend = spawn(process.execPath, [frontendCli, 'serve'], {
      cwd: frontendDirectory,
      env: process.env,
      stdio: 'inherit'
    });
    monitor(frontend, 'Angular');
  })
  .catch(error => {
    if (!stopping) {
      console.error(error.message);
      stop(1);
    }
  });
