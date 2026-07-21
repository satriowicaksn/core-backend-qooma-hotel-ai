// Public API of the billing module. Internal units stay unexported —
// bootstrap wires via buildBillingService.

import type { PrismaClient } from '@prisma/client';

import type { Logger } from '@core/logger/logger.js';

// eslint-disable-next-line no-restricted-imports -- barrel/factory is the sanctioned wiring seam; service still consumes port only
import { InMemoryBillingPdfStorageAdapter } from './adapters/in-memory-billing-pdf-storage.adapter.js';
// eslint-disable-next-line no-restricted-imports -- barrel/factory is the sanctioned wiring seam; service still consumes port only
import { LogOnlyTopupNotifierAdapter } from './adapters/log-only-topup-notifier.adapter.js';
import { BillingRepository } from './billing.repository.js';
import { BillingService } from './billing.service.js';
import type { BillingPdfStoragePort } from './ports/billing-pdf-storage.port.js';
import type { TopupNotifierPort } from './ports/topup-notifier.port.js';

export { billingRoutes, type BillingRoutesOptions } from './billing.routes.js';
export { BillingService } from './billing.service.js';
// eslint-disable-next-line no-restricted-imports -- barrel re-export lets bootstrap wire adapter at composition root; service depends on port only
export { LogOnlyTopupNotifierAdapter } from './adapters/log-only-topup-notifier.adapter.js';
// eslint-disable-next-line no-restricted-imports -- barrel re-export lets bootstrap wire adapter at composition root; service depends on port only
export { InMemoryBillingPdfStorageAdapter } from './adapters/in-memory-billing-pdf-storage.adapter.js';
export type {
  TopupNotifierPort,
  TopupNotifyInput,
  TopupNotifyResult,
} from './ports/topup-notifier.port.js';
export type { BillingPdfStoragePort } from './ports/billing-pdf-storage.port.js';
export type { OutboundTopupBody } from './billing.schema.js';
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
  TopupPackage,
} from './billing.types.js';

export interface BuildBillingServiceOptions {
  readonly logger: Logger;
  readonly topupNotifier?: TopupNotifierPort;
  readonly pdfStorage?: BillingPdfStoragePort;
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
}

export function buildBillingService(
  db: PrismaClient,
  opts: BuildBillingServiceOptions,
): BillingService {
  const topupNotifier = opts.topupNotifier ?? new LogOnlyTopupNotifierAdapter(opts.logger);
  const pdfStorage = opts.pdfStorage ?? new InMemoryBillingPdfStorageAdapter();
  return new BillingService(new BillingRepository(db), topupNotifier, pdfStorage, {
    logger: opts.logger,
    skipCrossDbChecks: opts.skipCrossDbChecks,
    nodeEnv: opts.nodeEnv,
  });
}
