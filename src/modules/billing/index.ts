// Public API of the billing module. Internal units stay unexported —
// bootstrap wires via buildBillingService.

import type { PrismaClient } from '@prisma/client';

import type { Logger } from '@core/logger/logger.js';

// eslint-disable-next-line no-restricted-imports -- barrel/factory is the sanctioned wiring seam; service still consumes port only
import { InMemoryBillingPdfStorageAdapter } from './adapters/in-memory-billing-pdf-storage.adapter.js';
// eslint-disable-next-line no-restricted-imports -- barrel/factory is the sanctioned wiring seam; service still consumes port only
import { LogOnlyUpgradeNotifierAdapter } from './adapters/log-only-upgrade-notifier.adapter.js';
import { BillingRepository } from './billing.repository.js';
import { BillingService } from './billing.service.js';
import type { BillingPdfStoragePort } from './ports/billing-pdf-storage.port.js';
import type { UpgradeNotifierPort } from './ports/upgrade-notifier.port.js';

export { billingRoutes, type BillingRoutesOptions } from './billing.routes.js';
export { BillingService } from './billing.service.js';
// eslint-disable-next-line no-restricted-imports -- barrel re-export lets bootstrap wire adapter at composition root; service depends on port only
export { LogOnlyUpgradeNotifierAdapter } from './adapters/log-only-upgrade-notifier.adapter.js';
// eslint-disable-next-line no-restricted-imports -- barrel re-export lets bootstrap wire adapter at composition root; service depends on port only
export { InMemoryBillingPdfStorageAdapter } from './adapters/in-memory-billing-pdf-storage.adapter.js';
export type {
  UpgradeNotifierPort,
  UpgradeNotifyInput,
  UpgradeNotifyResult,
} from './ports/upgrade-notifier.port.js';
export type { BillingPdfStoragePort } from './ports/billing-pdf-storage.port.js';
export type { UpgradePackageBody } from './billing.schema.js';
export type {
  BillingOverviewResponse,
  BillingOverviewWire,
  ExtraWire,
  InvoiceStatus,
  InvoiceWire,
  QuotaWire,
  TierName,
  TierSnapshotWire,
  UpgradeRequestResponse,
  UpgradeRequestWire,
  UpgradeTargetTier,
} from './billing.types.js';

export interface BuildBillingServiceOptions {
  readonly logger: Logger;
  readonly upgradeNotifier?: UpgradeNotifierPort;
  readonly pdfStorage?: BillingPdfStoragePort;
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
}

export function buildBillingService(
  db: PrismaClient,
  opts: BuildBillingServiceOptions,
): BillingService {
  const upgradeNotifier = opts.upgradeNotifier ?? new LogOnlyUpgradeNotifierAdapter(opts.logger);
  const pdfStorage = opts.pdfStorage ?? new InMemoryBillingPdfStorageAdapter();
  return new BillingService(new BillingRepository(db), upgradeNotifier, pdfStorage, {
    logger: opts.logger,
    skipCrossDbChecks: opts.skipCrossDbChecks,
    nodeEnv: opts.nodeEnv,
  });
}
