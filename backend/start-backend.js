const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse .env manually
const envPath = path.join(__dirname, '.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      envConfig[key] = value;
    }
  });
}

const out = fs.openSync('./stdout.log', 'w');
const err = fs.openSync('./stderr.log', 'w');

const child = spawn('node', ['-r', 'ts-node/register', 'src/main.ts'], {
  detached: true,
  stdio: ['ignore', out, err],
  env: { ...process.env, ...envConfig, TS_NODE_TRANSPILE_ONLY: 'true' }
});

child.unref();
console.log('Server spawned with PID:', child.pid);
process.exit(0);
