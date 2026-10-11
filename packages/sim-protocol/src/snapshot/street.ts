// The seam between the snapshot and M2.7's errand store (Task 4): what a blob shows of its errand, read once per blob by
// writeSnapshot. Until the store lands, no blob is indoors, carries a good or eats. Task 4 gives each function the
// parameters (world: World, blob: number), replaces its body with a read of the store's row, and passes them at the
// three calls in writeSnapshot.
export function indoorsAt(): number {
  return 0;
}

// 0 for nothing carried, else the good's id (BREAD 1 to FUEL 7).
export function itemAt(): number {
  return 0;
}

export function eatingAt(): number {
  return 0;
}
