-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "password" TEXT,
    "tenantId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT,
    "dailyQuota" INTEGER NOT NULL DEFAULT 10,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'exploration',
    "description" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "assignedRegion" TEXT NOT NULL DEFAULT 'us-east-1',
    "queueWaitMs" INTEGER NOT NULL DEFAULT 0,
    "computeDurationMs" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "internalOptimizationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scalingImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionStep" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL DEFAULT 'default',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agentType" TEXT NOT NULL,
    "inputData" JSONB,
    "outputData" JSONB,
    "region" TEXT NOT NULL DEFAULT 'us-east-1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'standby',
    "health" INTEGER NOT NULL DEFAULT 100,
    "tenantId" TEXT,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'platform-admin',
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "status" TEXT DEFAULT 'success',
    "ipAddress" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposedChange" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'platform-admin',
    "targetPath" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "expectedImpact" JSONB,
    "validationScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposedChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "tenantId" TEXT,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "eventId" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "metadata" JSONB,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "stripeId" TEXT,
    "productId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMetric" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeModule" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildMetric" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenantId" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceROI" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'platform-admin',
    "period" TEXT NOT NULL,
    "optimizations" INTEGER NOT NULL DEFAULT 0,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "efficiencyGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceROI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligencePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'platform-admin',
    "name" TEXT NOT NULL,
    "costWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.33,
    "performanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.33,
    "reliabilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.34,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligencePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScalingDecision" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "reason" TEXT,
    "roi" DOUBLE PRECISION,
    "improvementPct" DOUBLE PRECISION,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScalingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "executionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'started',
    "response" JSONB,
    "region" TEXT NOT NULL DEFAULT 'us-east-1',
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZtanIdentity" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZtanIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZtanProof" (
    "id" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "bundle" JSONB NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "finalAnchor" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZtanProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StepDependencies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFile_projectId_path_key" ON "ProjectFile"("projectId", "path");

-- CreateIndex
CREATE INDEX "MissionStep_missionId_idx" ON "MissionStep"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionStep_missionId_stepKey_key" ON "MissionStep"("missionId", "stepKey");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ProposedChange_tenantId_idx" ON "ProposedChange"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionLog_eventId_key" ON "ExecutionLog"("eventId");

-- CreateIndex
CREATE INDEX "ExecutionLog_executionId_idx" ON "ExecutionLog"("executionId");

-- CreateIndex
CREATE INDEX "ExecutionLog_tenantId_idx" ON "ExecutionLog"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventId_key" ON "Event"("eventId");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_tenantId_idx" ON "Event"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_stripeId_idx" ON "Subscription"("stripeId");

-- CreateIndex
CREATE INDEX "ProductMetric_productId_idx" ON "ProductMetric"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeModule_path_key" ON "CodeModule"("path");

-- CreateIndex
CREATE INDEX "BuildMetric_tenantId_idx" ON "BuildMetric"("tenantId");

-- CreateIndex
CREATE INDEX "IntelligenceROI_tenantId_period_idx" ON "IntelligenceROI"("tenantId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligencePolicy_name_key" ON "IntelligencePolicy"("name");

-- CreateIndex
CREATE INDEX "IntelligencePolicy_tenantId_idx" ON "IntelligencePolicy"("tenantId");

-- CreateIndex
CREATE INDEX "ScalingDecision_createdAt_idx" ON "ScalingDecision"("createdAt");

-- CreateIndex
CREATE INDEX "BetaFeedback_tenantId_idx" ON "BetaFeedback"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_executionId_idx" ON "IdempotencyRecord"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "ZtanIdentity_nodeId_key" ON "ZtanIdentity"("nodeId");

-- CreateIndex
CREATE INDEX "ZtanIdentity_nodeId_idx" ON "ZtanIdentity"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ZtanProof_inputHash_key" ON "ZtanProof"("inputHash");

-- CreateIndex
CREATE INDEX "ZtanProof_inputHash_idx" ON "ZtanProof"("inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "_StepDependencies_AB_unique" ON "_StepDependencies"("A", "B");

-- CreateIndex
CREATE INDEX "_StepDependencies_B_index" ON "_StepDependencies"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionStep" ADD CONSTRAINT "MissionStep_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildMetric" ADD CONSTRAINT "BuildMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepDependencies" ADD CONSTRAINT "_StepDependencies_A_fkey" FOREIGN KEY ("A") REFERENCES "MissionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepDependencies" ADD CONSTRAINT "_StepDependencies_B_fkey" FOREIGN KEY ("B") REFERENCES "MissionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
