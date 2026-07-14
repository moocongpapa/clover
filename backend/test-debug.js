console.log("1. Starting import...");
const { NestFactory } = require('@nestjs/core');
console.log("2. NestFactory imported.");
const { AppModule } = require('./dist/src/app.module');
console.log("3. AppModule imported.");

async function test() {
  try {
    console.log("4. Calling NestFactory.create...");
    const app = await NestFactory.create(AppModule);
    console.log("5. Nest application created.");
    await app.listen(3000);
    console.log("6. Listening on port 3000 successfully!");
    await app.close();
    process.exit(0);
  } catch (err) {
    console.error("DEBUG ERROR:", err);
    process.exit(1);
  }
}
test();
