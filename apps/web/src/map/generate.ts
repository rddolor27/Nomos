import { placeBuffers, type PlaceReply, type PlaceRequest } from '@nomos/sim-protocol/place';
import { crowdBuffers, worldMapBuffers, type MapAppMessage, type MapWorkerMessage } from '@nomos/sim-protocol/world-map';
import {
  buildSite,
  crowdOf,
  generateWorld,
  layoutOf,
  placeContexts,
  placeNames,
  placeWalks,
  type PlaceContext,
} from '@nomos/worldgen';

export interface MapAnswer {
  reply: MapWorkerMessage;
  transfer: ArrayBuffer[];
  // What the worker keeps to build the world's places, since every column of the map is transferred away.
  contexts: PlaceContext[];
}

export interface PlaceAnswer {
  reply: PlaceReply;
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

// Its second: place p of the last world, laid out with its walk loops, timed, every buffer listed.
export function answerPlace(msg: PlaceRequest, contexts: readonly PlaceContext[], now: () => number): PlaceAnswer {
  const ctx = contexts[msg.place];
  if (!ctx) throw new RangeError(`the map worker has no place ${msg.place}; its world has ${contexts.length}`);
  const start = now();
  const site = buildSite(ctx);
  const layout = layoutOf(site);
  const walks = placeWalks(site);
  const ms = now() - start;
  return { reply: { type: 'place', place: msg.place, layout, walks, ms }, transfer: placeBuffers(layout, walks) };
}
