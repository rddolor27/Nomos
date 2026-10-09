import { crowdBuffers, worldMapBuffers, type MapAppMessage, type MapWorkerMessage } from '@nomos/sim-protocol/world-map';
import { crowdOf, generateWorld, placeNames } from '@nomos/worldgen';

export interface MapAnswer {
  reply: MapWorkerMessage;
  transfer: ArrayBuffer[];
}

// The map worker's one job: a world, its names and its crowd, every buffer listed, so the page never copies a column.
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
  const transfer = [...worldMapBuffers(map), ...crowdBuffers(crowd)];
  return { reply: { type: 'world', map, names, crowd, stageMs }, transfer };
}
