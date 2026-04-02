-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EnergyPointType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'RURAL', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'UPLOADED', 'PROCESSING', 'EXTRACTED', 'VALIDATED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('HIGH_CONSUMPTION', 'HIGH_BILL', 'GENERATION_DROP', 'SOLAR_ISSUE', 'INCONSISTENT_READING', 'MISSING_BILL', 'GENERAL');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TutorialCategory" AS ENUM ('SOLAR_BASICS', 'BILLING', 'MONITORING', 'MAINTENANCE', 'FAQ', 'SAVINGS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'CPF',
    "document" TEXT,
    "responsibleName" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_units" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "consumerUnitCode" TEXT,
    "utility" TEXT,
    "zipCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "observations" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_points" (
    "id" TEXT NOT NULL,
    "addressUnitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointType" "EnergyPointType" NOT NULL DEFAULT 'RESIDENTIAL',
    "hasSolar" BOOLEAN NOT NULL DEFAULT false,
    "solarPowerKwp" DOUBLE PRECISION,
    "panelsCount" INTEGER,
    "installDate" TIMESTAMP(3),
    "inverterModel" TEXT,
    "technicalNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bills" (
    "id" TEXT NOT NULL,
    "addressUnitId" TEXT NOT NULL,
    "referenceMonth" INTEGER NOT NULL,
    "referenceYear" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bill_files" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "extractedText" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utility_bill_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bill_extracted_data" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "utilityName" TEXT,
    "consumerUnitCode" TEXT,
    "referenceMonthStr" TEXT,
    "previousReading" DOUBLE PRECISION,
    "currentReading" DOUBLE PRECISION,
    "consumptionKwh" DOUBLE PRECISION,
    "injectedEnergyKwh" DOUBLE PRECISION,
    "energyCreditsKwh" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "energyAmount" DOUBLE PRECISION,
    "networkUsageFee" DOUBLE PRECISION,
    "avgConsumption" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "readingDate" TIMESTAMP(3),
    "isManuallyReviewed" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_bill_extracted_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumption_history" (
    "id" TEXT NOT NULL,
    "addressUnitId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "consumptionKwh" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "injectedKwh" DOUBLE PRECISION,
    "creditsKwh" DOUBLE PRECISION,
    "estimatedSavings" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumption_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "addressUnitId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "referenceMonth" INTEGER,
    "referenceYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "TutorialCategory" NOT NULL,
    "readingTime" INTEGER,
    "icon" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorial_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_userId_key" ON "client_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "utility_bill_extracted_data_billId_key" ON "utility_bill_extracted_data"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "consumption_history_addressUnitId_month_year_key" ON "consumption_history"("addressUnitId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_articles_slug_key" ON "tutorial_articles"("slug");

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address_units" ADD CONSTRAINT "address_units_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_points" ADD CONSTRAINT "energy_points_addressUnitId_fkey" FOREIGN KEY ("addressUnitId") REFERENCES "address_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_addressUnitId_fkey" FOREIGN KEY ("addressUnitId") REFERENCES "address_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bill_files" ADD CONSTRAINT "utility_bill_files_billId_fkey" FOREIGN KEY ("billId") REFERENCES "utility_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bill_extracted_data" ADD CONSTRAINT "utility_bill_extracted_data_billId_fkey" FOREIGN KEY ("billId") REFERENCES "utility_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_history" ADD CONSTRAINT "consumption_history_addressUnitId_fkey" FOREIGN KEY ("addressUnitId") REFERENCES "address_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_addressUnitId_fkey" FOREIGN KEY ("addressUnitId") REFERENCES "address_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
