// Q-T27-#7 local port — foundation `ObjectStoragePort` at
// `src/core/storage/object-storage.port.ts` currently exposes `upload` + `delete`
// only; the T08 slice-1 comment (L8-11) explicitly defers additional surface.
// Slice-1 ships this local port so billing can stream invoice PDFs today; the
// migration when Slot A extends the core port is a one-line barrel swap
// (structurally identical shape).

export interface BillingPdfStoragePort {
  download(key: string): Promise<Buffer | null>;
}
