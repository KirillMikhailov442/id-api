import source from "@config/database";
import { seedDatabase } from "@config/database-seed";

async function runSeed(): Promise<void> {
  await source.initialize();

  try {
    await seedDatabase(source);
  } finally {
    await source.destroy();
  }
}

runSeed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
