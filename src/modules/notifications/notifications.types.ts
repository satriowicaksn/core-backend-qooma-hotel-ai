// Domain + wire (snake_case) types for the notifications surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).

import type { Prisma } from '@prisma/client';

export type NotificationRow = Prisma.NotificationGetPayload<Record<string, never>>;

export interface NotificationCursor {
  readonly createdAt: string;
  readonly id: string;
}

export interface NotificationListFilters {
  readonly isRead?: boolean;
}

export interface NotificationListQuery {
  readonly filters: NotificationListFilters;
  readonly limit: number;
  readonly cursor?: NotificationCursor;
}

// Wire shape — §1.6 field set incl. hotel_id/user_id (the requester's own).
export interface NotificationWire {
  readonly id: string;
  readonly hotel_id: string;
  readonly user_id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string | null;
  readonly link: string | null;
  readonly metadata: unknown;
  readonly is_read: boolean;
  readonly read_at: string | null;
  readonly created_at: string;
}

export interface NotificationListResponse {
  readonly data: readonly NotificationWire[];
  readonly pageInfo: {
    readonly nextCursor: string | null;
    readonly hasMore: boolean;
  };
}

export interface NotificationResponse {
  readonly data: NotificationWire;
}

export interface UnreadCountResponse {
  readonly data: { readonly count: number };
}

export interface MarkAllResponse {
  readonly data: { readonly updated: number };
}
