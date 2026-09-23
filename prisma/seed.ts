import { hashPassword } from "../lib/auth/password";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const general = await prisma.hourCategory.upsert({
    where: { slug: "general" },
    update: {},
    create: { name: "General", slug: "general", color: "#9a9a9a", sortOrder: 0 },
  });
  const engineering = await prisma.hourCategory.upsert({
    where: { slug: "engineering" },
    update: {},
    create: { name: "Engineering", slug: "engineering", color: "#5b8def", sortOrder: 1 },
  });
  await prisma.hourCategory.upsert({
    where: { slug: "design" },
    update: {},
    create: { name: "Design", slug: "design", color: "#c084fc", sortOrder: 2 },
  });
  await prisma.hourCategory.upsert({
    where: { slug: "pm" },
    update: {},
    create: { name: "PM", slug: "pm", color: "#34d399", sortOrder: 3 },
  });

  const adminHash = await hashPassword("ChangeMe-Admin-1");
  await prisma.user.upsert({
    where: { email: "logan@valere.io" },
    update: { passwordHash: adminHash, role: "ADMIN", hourCategoryId: engineering.id },
    create: {
      email: "logan@valere.io",
      name: "Logan Reilly",
      role: "ADMIN",
      passwordHash: adminHash,
      hourCategoryId: engineering.id,
    },
  });

  const staffHash = await hashPassword("ChangeMe-Staff-1");
  await prisma.user.upsert({
    where: { email: "staff@valere.io" },
    update: { passwordHash: staffHash, hourCategoryId: general.id },
    create: {
      email: "staff@valere.io",
      name: "Valere Staff",
      role: "STAFF",
      passwordHash: staffHash,
      hourCategoryId: general.id,
    },
  });

  const acme = await prisma.client.upsert({
    where: { mondayItemId: "local-acme" },
    update: {},
    create: {
      mondayItemId: "local-acme",
      name: "Acme Corp",
      status: "Active",
      trackable: true,
      accountManager: "Logan Reilly",
    },
  });

  const clientHash = await hashPassword("ChangeMe-Client-1");
  await prisma.user.upsert({
    where: { email: "client@acme.example" },
    update: { clientId: acme.id, passwordHash: clientHash, role: "CLIENT" },
    create: {
      email: "client@acme.example",
      name: "Acme Client",
      role: "CLIENT",
      clientId: acme.id,
      passwordHash: clientHash,
    },
  });

  const sow = await prisma.contractChunk.findFirst({
    where: { clientId: acme.id, sourceFile: "sample-sow.txt" },
  });
  if (!sow) {
    await prisma.contractChunk.create({
      data: {
        clientId: acme.id,
        sourceFile: "sample-sow.txt",
        text: "This Statement of Work covers software engineering hours consumed as logged. Out-of-scope work requires a written change order. Unused expired retainer hours do not create a refund unless expressly stated.",
      },
    });
  }

  const existingGrant = await prisma.budgetGrant.findFirst({
    where: { clientId: acme.id, note: "Seed prepaid engineering" },
  });
  if (!existingGrant) {
    await prisma.budgetGrant.create({
      data: {
        clientId: acme.id,
        hourCategoryId: engineering.id,
        hours: 40,
        type: "initial",
        note: "Seed prepaid engineering",
      },
    });
    await prisma.budgetGrant.create({
      data: {
        clientId: acme.id,
        hourCategoryId: general.id,
        hours: 10,
        type: "initial",
        note: "Seed prepaid general",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
