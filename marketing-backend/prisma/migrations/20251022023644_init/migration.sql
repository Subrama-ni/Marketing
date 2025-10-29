/*
  Warnings:

  - You are about to alter the column `commission` on the `Entry` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `amountPaid` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDate` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[serial]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "commission" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amountPaid",
DROP COLUMN "method",
DROP COLUMN "paymentDate",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dates" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Customer_serial_key" ON "Customer"("serial");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");
