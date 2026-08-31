import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
const adapter = new PrismaPg({ connectionString: env.databaseUrl });
const prisma = new PrismaClient({
    adapter,
    log: ["error", "warn"],
});
export default prisma;
//# sourceMappingURL=prisma.js.map