-- AlterEnum
ALTER TYPE "ExportDataset" ADD VALUE 'AGGREGATOR_COMMISSION';

-- AlterTable
ALTER TABLE "integration_configs" ADD COLUMN     "commission_rate_percent" DECIMAL(5,2);
