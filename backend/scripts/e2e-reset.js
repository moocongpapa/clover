const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'e2e.db');
const journal = `${dbPath}-journal`;

for (const file of [dbPath, journal]) {
  try {
    fs.unlinkSync(file);
  } catch {
    // fresh start
  }
}

console.log('E2E database reset:', dbPath);
