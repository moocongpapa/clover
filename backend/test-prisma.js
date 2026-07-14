const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Connecting to database...");
    const count = await prisma.user.count();
    console.log("Database connected! User count:", count);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("PRISMA ERROR:", err);
    process.exit(1);
  }
}
test();
