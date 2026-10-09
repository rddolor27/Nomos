import type { PlaceError, PlaceReply, PlaceRequest } from '@nomos/sim-protocol/place';
import { crowdBuffers, worldMapBuffers, type MapAppMessage, type MapWorkerMessage } from '@nomos/sim-protocol/world-map';
import { crowdOf, generateWorld, placeContexts, placeNames, type PlaceContext } from '@nomos/worldgen';

export interface MapAnswer {
  reply: MapWorkerMessage;
  transfer: ArrayBuffer[];
  // What the worker keeps to build the world's places, since every column of the map is transferred away.
  contexts: PlaceContext[];
}

export interface PlaceAnswer {
  reply: PlaceReply | PlaceError;
  transfer: ArrayBuffer[];
}

// The map worker's first job: a world, its names and its crowd, every buffer listed, so the page never copies a column.
export function answerGenerate(msg: MapAppMessage, now: () => number): MapAnswer {
  const stageMs: Record<string, number> = {};
  let last = now();
  const lap = (stage: string): void => {
    const at = now();
    stageMs[stage] = at - last;
    last = at;
  };
  const map = generateWorld(msg.seed, msg.size, { lap });
  const names = placeNames(map);
  lap('names');
  const crowd = crowdOf(map);
  lap('crowd');
  const contexts = placeContexts(map);
  const transfer = [...worldMapBuffers(map), ...crowdBuffers(crowd)];
  return { reply: { type: 'world', map, names, crowd, stageMs }, transfer, contexts };
}

// Its second: place p of the world the request was made in, or a place-error for p, never a throw, so the page can match
// a failure to its request. The builder loads on the first request only.
export async function answerPlace(
  msg: PlaceRequest,
  contexts: readonly PlaceContext[],
  now: () => number,
): Promise<PlaceAnswer> {
  const ctx = contexts[msg.place];
  if (!ctx) return placeError(msg.place, `the map worker has no place ${msg.place}; its world has ${contexts.length}`);
  try {
    const { buildPlaceAnswer } = await import('./place-builder.ts');
    return buildPlaceAnswer(msg.place, ctx, now);
  } catch (error) {
    return placeError(msg.place, error instanceof Error ? error.message : String(error));
  }
}

function placeError(place: number, message: string): PlaceAnswer {
  return { reply: { type: 'place-error', place, message }, transfer: [] };
}
