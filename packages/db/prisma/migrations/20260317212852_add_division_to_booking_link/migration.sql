-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('CONSUMABLE', 'EQUIPMENT', 'SERVICE');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OFFICE', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "Division" AS ENUM ('EXTERMINATION', 'ENTREPRISES', 'RENOVATION');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'FR');

-- CreateEnum
CREATE TYPE "PestType" AS ENUM ('MICE', 'RAT', 'ANTS', 'BEDBUGS', 'COCKROACHES', 'SPIDERS', 'WASPS', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CURATIVE', 'PREVENTATIVE', 'MAINTENANCE', 'INSPECTION');

-- CreateEnum
CREATE TYPE "ServiceTier" AS ENUM ('STANDARD', 'PREMIUM', 'ECO');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'CLICKED', 'SUBMITTED_INTERNAL', 'REDIRECTED_GOOGLE');

-- CreateEnum
CREATE TYPE "Seasonality" AS ENUM ('ALL_YEAR', 'SPRING_ONLY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH', 'TRANSFER', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "CommissionRole" AS ENUM ('SALES', 'SUPERVISION', 'UPSELL');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseFrequency" AS ENUM ('ONCE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "password" TEXT,
    "commissionPercentageSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPercentageSupervision" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPercentageUpsell" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "internalHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "canManageCommissions" BOOLEAN NOT NULL DEFAULT false,
    "canManageDivisions" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "canManageTimesheets" BOOLEAN NOT NULL DEFAULT false,
    "canManageExpenses" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "divisions" "Division"[] DEFAULT ARRAY['EXTERMINATION']::"Division"[],
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "language" "Language" NOT NULL DEFAULT 'FR',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDivisionAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "division" "Division" NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "canManageTimesheets" BOOLEAN NOT NULL DEFAULT false,
    "canManageExpenses" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "canManageCommissions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDivisionAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivisionSettings" (
    "id" TEXT NOT NULL,
    "division" "Division" NOT NULL,
    "emailSenderName" TEXT NOT NULL,
    "emailSenderAddress" TEXT NOT NULL,
    "resendApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DivisionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "billingAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "divisions" "Division"[] DEFAULT ARRAY['EXTERMINATION']::"Division"[],
    "language" "Language" NOT NULL DEFAULT 'FR',

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "street" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "province" TEXT DEFAULT 'QC',
    "country" TEXT DEFAULT 'Canada',
    "type" "PropertyType" NOT NULL DEFAULT 'RESIDENTIAL',
    "accessInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "warrantyExpiresAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "enRouteAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "travelDurationMinutes" INTEGER,
    "actualDurationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "division" "Division" NOT NULL DEFAULT 'EXTERMINATION',
    "grossMarginPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDirectCosts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salesRepId" TEXT,
    "supervisorId" TEXT,
    "totalJobCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signature" TEXT,
    "clientSignature" TEXT,
    "technicianSignature" TEXT,
    "reportNotes" TEXT,
    "internalNotes" TEXT,
    "serviceReportUrl" TEXT,
    "isClientUnreachable" BOOLEAN NOT NULL DEFAULT false,
    "quoteId" TEXT,
    "invoiceTriggered" BOOLEAN NOT NULL DEFAULT false,
    "parentJobId" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNote" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedProduct" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TreatmentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetPest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TargetPest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ApplicationMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "poNumber" TEXT,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "division" "Division" NOT NULL DEFAULT 'EXTERMINATION',
    "number" TEXT,
    "signature" TEXT,
    "signedAt" TIMESTAMP(3),
    "salesRepId" TEXT,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isUpsell" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "poNumber" TEXT,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "division" "Division" NOT NULL DEFAULT 'EXTERMINATION',
    "number" TEXT,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isUpsell" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommissionRole" NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobActivity" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "usageDescription" TEXT,
    "activeIngredient" TEXT,
    "recommendedConcentration" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "warrantyInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "division" "Division" NOT NULL DEFAULT 'EXTERMINATION',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" "ProductType" NOT NULL DEFAULT 'CONSUMABLE',
    "isCommissionEligible" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "minTechnicians" INTEGER NOT NULL DEFAULT 1,
    "pestType" "PestType",
    "category" "ServiceCategory" DEFAULT 'CURATIVE',
    "tier" "ServiceTier" DEFAULT 'STANDARD',
    "warrantyMonths" INTEGER,
    "warrantyDetails" TEXT,
    "numberOfVisits" INTEGER NOT NULL DEFAULT 1,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceIntervalDays" INTEGER,
    "seasonStartMonth" INTEGER,
    "seasonEndMonth" INTEGER,
    "isPackage" BOOLEAN NOT NULL DEFAULT false,
    "containerSize" DOUBLE PRECISION,
    "preparationListUrl" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncludedService" (
    "id" TEXT NOT NULL,
    "parentProductId" TEXT NOT NULL,
    "childProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 1,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "seasonality" "Seasonality" NOT NULL DEFAULT 'ALL_YEAR',
    "isWeatherDependent" BOOLEAN NOT NULL DEFAULT false,
    "applyToRecurring" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IncludedService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMaterial" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ServiceMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAudit" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAuditItem" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expectedQuantity" DOUBLE PRECISION NOT NULL,
    "actualQuantity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "InventoryAuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "score" INTEGER,
    "feedback" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesStep" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "seasonality" "Seasonality" NOT NULL DEFAULT 'ALL_YEAR',
    "isWeatherDependent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SeriesStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "division" "Division" NOT NULL DEFAULT 'EXTERMINATION',

    CONSTRAINT "BookingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "durationMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "startLat" DOUBLE PRECISION,
    "startLng" DOUBLE PRECISION,
    "endLat" DOUBLE PRECISION,
    "endLng" DOUBLE PRECISION,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'OPEN',
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startKm" INTEGER,
    "endKm" INTEGER,
    "startOdometerPhotoId" TEXT,
    "endOdometerPhotoId" TEXT,
    "startLocation" TEXT,
    "endLocation" TEXT,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GPSBreadcrumb" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,

    CONSTRAINT "GPSBreadcrumb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "accountingCode" TEXT,
    "division" "Division",
    "frequency" "ExpenseFrequency" NOT NULL DEFAULT 'ONCE',
    "nextOccurrence" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CREDIT_CARD',

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JobToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_TreatmentLocationToUsedProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_TargetPestToUsedProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ApplicationMethodToUsedProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserDivisionAccess_userId_division_key" ON "UserDivisionAccess"("userId", "division");

-- CreateIndex
CREATE UNIQUE INDEX "DivisionSettings_division_key" ON "DivisionSettings"("division");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentLocation_name_key" ON "TreatmentLocation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TargetPest_name_key" ON "TargetPest"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationMethod_name_key" ON "ApplicationMethod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "IncludedService_parentProductId_idx" ON "IncludedService"("parentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceMaterial_serviceId_materialId_key" ON "ServiceMaterial"("serviceId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_productId_userId_key" ON "InventoryItem"("productId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_jobId_key" ON "ReviewRequest"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_token_key" ON "ReviewRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLink_token_key" ON "BookingLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "_JobToUser_AB_unique" ON "_JobToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_JobToUser_B_index" ON "_JobToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TreatmentLocationToUsedProduct_AB_unique" ON "_TreatmentLocationToUsedProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_TreatmentLocationToUsedProduct_B_index" ON "_TreatmentLocationToUsedProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TargetPestToUsedProduct_AB_unique" ON "_TargetPestToUsedProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_TargetPestToUsedProduct_B_index" ON "_TargetPestToUsedProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ApplicationMethodToUsedProduct_AB_unique" ON "_ApplicationMethodToUsedProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_ApplicationMethodToUsedProduct_B_index" ON "_ApplicationMethodToUsedProduct"("B");

-- AddForeignKey
ALTER TABLE "UserDivisionAccess" ADD CONSTRAINT "UserDivisionAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_parentJobId_fkey" FOREIGN KEY ("parentJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedProduct" ADD CONSTRAINT "UsedProduct_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedProduct" ADD CONSTRAINT "UsedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncludedService" ADD CONSTRAINT "IncludedService_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncludedService" ADD CONSTRAINT "IncludedService_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaterial" ADD CONSTRAINT "ServiceMaterial_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaterial" ADD CONSTRAINT "ServiceMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditItem" ADD CONSTRAINT "InventoryAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "InventoryAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditItem" ADD CONSTRAINT "InventoryAuditItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesStep" ADD CONSTRAINT "SeriesStep_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ProductSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesStep" ADD CONSTRAINT "SeriesStep_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GPSBreadcrumb" ADD CONSTRAINT "GPSBreadcrumb_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "TimesheetEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobToUser" ADD CONSTRAINT "_JobToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobToUser" ADD CONSTRAINT "_JobToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TreatmentLocationToUsedProduct" ADD CONSTRAINT "_TreatmentLocationToUsedProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "TreatmentLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TreatmentLocationToUsedProduct" ADD CONSTRAINT "_TreatmentLocationToUsedProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "UsedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TargetPestToUsedProduct" ADD CONSTRAINT "_TargetPestToUsedProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "TargetPest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TargetPestToUsedProduct" ADD CONSTRAINT "_TargetPestToUsedProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "UsedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationMethodToUsedProduct" ADD CONSTRAINT "_ApplicationMethodToUsedProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "ApplicationMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationMethodToUsedProduct" ADD CONSTRAINT "_ApplicationMethodToUsedProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "UsedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
