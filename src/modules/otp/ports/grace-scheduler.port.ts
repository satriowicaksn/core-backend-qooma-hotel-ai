// Queue-producer port (CLAUDE.md §4 WAJIB — Bull enqueue called from a
// service must go through a port for testability). The grace timer starts
// when staff presses [Sudah diantar/DONE] — NOT at order intake (ADD-24.3).

export interface GraceScheduleInput {
  readonly ticketId: string;
  readonly delayMs: number;
  readonly scheduledFor: Date;
}

export interface GraceSchedulerPort {
  schedule(input: GraceScheduleInput): Promise<void>;
}
