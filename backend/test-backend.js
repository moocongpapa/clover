const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const fs = require('fs');

async function test() {
  try {
    console.log("Starting AppModule bootstrap...");
    const app = await NestFactory.create(AppModule);
    console.log("AppModule bootstrap successful!");
    await app.close();
    process.exit(0);
  } catch (err) {
    fs.writeFileSync('error.txt', err.stack || err.message || err);
    console.error("BOOTSTRAP ERROR:", err);
    process.exit(1);
  }
}
test();
