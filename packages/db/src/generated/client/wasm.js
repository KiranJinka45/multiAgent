
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  role: 'role',
  password: 'password',
  tenantId: 'tenantId',
  organizationId: 'organizationId',
  createdAt: 'createdAt'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  deviceInfo: 'deviceInfo',
  expiresAt: 'expiresAt',
  lastActiveAt: 'lastActiveAt',
  createdAt: 'createdAt'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  ownerId: 'ownerId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  organizationId: 'organizationId',
  dailyQuota: 'dailyQuota',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  status: 'status',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProjectFileScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  path: 'path',
  content: 'content',
  language: 'language',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MissionScalarFieldEnum = {
  id: 'id',
  title: 'title',
  status: 'status',
  progress: 'progress',
  type: 'type',
  description: 'description',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  metadata: 'metadata',
  assignedRegion: 'assignedRegion',
  queueWaitMs: 'queueWaitMs',
  computeDurationMs: 'computeDurationMs',
  totalCostUsd: 'totalCostUsd',
  internalOptimizationCost: 'internalOptimizationCost',
  margin: 'margin',
  scalingImpact: 'scalingImpact'
};

exports.Prisma.MissionStepScalarFieldEnum = {
  id: 'id',
  missionId: 'missionId',
  title: 'title',
  stepKey: 'stepKey',
  description: 'description',
  status: 'status',
  agentType: 'agentType',
  inputData: 'inputData',
  outputData: 'outputData',
  region: 'region',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AgentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  status: 'status',
  health: 'health',
  tenantId: 'tenantId',
  lastActive: 'lastActive'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  action: 'action',
  resource: 'resource',
  targetId: 'targetId',
  metadata: 'metadata',
  status: 'status',
  ipAddress: 'ipAddress',
  hash: 'hash',
  createdAt: 'createdAt'
};

exports.Prisma.ProposedChangeScalarFieldEnum = {
  id: 'id',
  agentId: 'agentId',
  tenantId: 'tenantId',
  targetPath: 'targetPath',
  changeType: 'changeType',
  reason: 'reason',
  patch: 'patch',
  expectedImpact: 'expectedImpact',
  validationScore: 'validationScore',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExecutionLogScalarFieldEnum = {
  id: 'id',
  executionId: 'executionId',
  tenantId: 'tenantId',
  stage: 'stage',
  status: 'status',
  message: 'message',
  progress: 'progress',
  metadata: 'metadata',
  eventId: 'eventId',
  hash: 'hash',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  type: 'type',
  userId: 'userId',
  tenantId: 'tenantId',
  metadata: 'metadata',
  eventId: 'eventId',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  stripeId: 'stripeId',
  productId: 'productId',
  plan: 'plan',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  price: 'price',
  createdAt: 'createdAt'
};

exports.Prisma.ProductMetricScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  metric: 'metric',
  value: 'value',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentEventScalarFieldEnum = {
  id: 'id',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.CodeModuleScalarFieldEnum = {
  id: 'id',
  path: 'path',
  content: 'content',
  hash: 'hash',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatternScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.BuildMetricScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  tenantId: 'tenantId',
  tokensUsed: 'tokensUsed',
  durationMs: 'durationMs',
  costUsd: 'costUsd',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.IntelligenceROIScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  period: 'period',
  optimizations: 'optimizations',
  failureRate: 'failureRate',
  estimatedSavings: 'estimatedSavings',
  efficiencyGain: 'efficiencyGain',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IntelligencePolicyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  costWeight: 'costWeight',
  performanceWeight: 'performanceWeight',
  reliabilityWeight: 'reliabilityWeight',
  isActive: 'isActive',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScalingDecisionScalarFieldEnum = {
  id: 'id',
  type: 'type',
  strategy: 'strategy',
  reason: 'reason',
  roi: 'roi',
  improvementPct: 'improvementPct',
  metrics: 'metrics',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BetaFeedbackScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  type: 'type',
  content: 'content',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IdempotencyRecordScalarFieldEnum = {
  id: 'id',
  key: 'key',
  executionId: 'executionId',
  status: 'status',
  response: 'response',
  region: 'region',
  lockedAt: 'lockedAt',
  completedAt: 'completedAt'
};

exports.Prisma.ZtanIdentityScalarFieldEnum = {
  id: 'id',
  nodeId: 'nodeId',
  publicKey: 'publicKey',
  status: 'status',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ZtanProofScalarFieldEnum = {
  id: 'id',
  inputHash: 'inputHash',
  bundle: 'bundle',
  canonicalHash: 'canonicalHash',
  finalAnchor: 'finalAnchor',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.OperationalSnapshotScalarFieldEnum = {
  id: 'id',
  timestamp: 'timestamp',
  epochId: 'epochId',
  healthStatus: 'healthStatus',
  quorumEntropy: 'quorumEntropy',
  activeWitnesses: 'activeWitnesses',
  priesthoodRisk: 'priesthoodRisk',
  silenceRisk: 'silenceRisk',
  infrastructureHealth: 'infrastructureHealth',
  legitimacyHealth: 'legitimacyHealth',
  sloAdherence: 'sloAdherence',
  operatorMetrics: 'operatorMetrics',
  tier: 'tier',
  hash: 'hash'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  UserSession: 'UserSession',
  Organization: 'Organization',
  Tenant: 'Tenant',
  Project: 'Project',
  ProjectFile: 'ProjectFile',
  Mission: 'Mission',
  MissionStep: 'MissionStep',
  Agent: 'Agent',
  AuditLog: 'AuditLog',
  ProposedChange: 'ProposedChange',
  ExecutionLog: 'ExecutionLog',
  Event: 'Event',
  Subscription: 'Subscription',
  Product: 'Product',
  ProductMetric: 'ProductMetric',
  PaymentEvent: 'PaymentEvent',
  CodeModule: 'CodeModule',
  Pattern: 'Pattern',
  BuildMetric: 'BuildMetric',
  IntelligenceROI: 'IntelligenceROI',
  IntelligencePolicy: 'IntelligencePolicy',
  ScalingDecision: 'ScalingDecision',
  BetaFeedback: 'BetaFeedback',
  IdempotencyRecord: 'IdempotencyRecord',
  ZtanIdentity: 'ZtanIdentity',
  ZtanProof: 'ZtanProof',
  OperationalSnapshot: 'OperationalSnapshot'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
