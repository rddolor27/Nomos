// Picks one food-lot layout per process (NOMOS_LAYOUT=packed|soa) so every call site stays monomorphic.
const layout = process.env.NOMOS_LAYOUT === 'soa' ? 'soa' : 'packed';
const M = await import(layout === 'soa' ? './food-soa.mjs' : './food-packed.mjs');

export const LAYOUT = layout;
export const bindFood = M.bindFood;
export const eatOne = M.eatOne;
export const addLot = M.addLot;
export const spoilHousehold = M.spoilHousehold;
export const spoilDay = M.spoilDay;
export const spoilDayPlain = M.spoilDayPlain;
export const lotWord = M.lotWord;
