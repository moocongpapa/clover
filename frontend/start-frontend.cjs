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

const child = spawn('./node_modules/.bin/vite', [], {
  detached: true,
  stdio: 'ignore',
  env: { ...process.env, ...envConfig }
});

child.unref();
console.log('Frontend spawned with PID:', child.pid);
process.exit(0);
