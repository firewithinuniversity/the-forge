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
  let data;
  try {
    data = await getSettingsData();
  } catch (err) {
    console.error("Settings page error:", err);
    data = {
      taxConfig: {
        id: "",
        federalTaxRate: 0.12,
        selfEmploymentRate: 0.153,
        seDeduction: 0.5,
        stateTaxRate: 0.0465,
        stateName: "Wisconsin",
        ownershipSplit: 0.5,
        qbiDeductionRate: 0.2,
        taxReserveRate: 0.3,
        partner1Name: "Brett Breunig",
        partner2Name: "Jude Begay",
        burnRateThreshold: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }
  return <SettingsClient data={data} />;
}
