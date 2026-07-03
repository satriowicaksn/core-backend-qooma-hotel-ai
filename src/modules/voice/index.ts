// Public API of the voice module. Internal units stay unexported —
// bootstrap wires via buildVoiceService.

import type { PrismaClient } from '@prisma/client';

import { VoiceRepository } from './voice.repository.js';
import { VoiceService } from './voice.service.js';

export { voiceRoutes, type VoiceRoutesOptions } from './voice.routes.js';
export { VoiceService } from './voice.service.js';
export type { UpsertVoiceBody } from './voice.schema.js';
export type {
  VoiceConfigResponse,
  VoiceConfigWire,
  VoiceTestResponse,
  VoiceTestResultWire,
} from './voice.types.js';

export function buildVoiceService(db: PrismaClient): VoiceService {
  return new VoiceService(new VoiceRepository(db));
}
