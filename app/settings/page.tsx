import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

async function getSettingsData() {
  let taxConfig = await prisma.taxConfig.findFirst();
  if (!taxConfig) {
    taxConfig = await prisma.taxConfig.create({ data: {} });
  }
  return {
    taxConfig: {
      ...taxConfig,
      createdAt: taxConfig.createdAt.toISOString(),
      updatedAt: taxConfig.updatedAt.toISOString(),
    },
  };
}

export default async function SettingsPage() {
  const data = await getSettingsData();
  return <SettingsClient data={data} />;
}
