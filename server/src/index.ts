import { createApp } from "./app";
import { config } from "./config";
import { prisma } from "./lib/prisma";
import { startCronJobs } from "./jobs/cron";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Roomly server listening on http://localhost:${config.port}`);
});

startCronJobs();

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
