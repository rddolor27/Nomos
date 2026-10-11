// The goods a blob can carry, in the order of the visual word's `item` field: code c is ITEM_GOODS[c - 1] and 0 is nothing.
// They name the `icons/carry_<good>` frames, and run from BREAD (1) to FUEL (7) as sim-core's GOOD_NAMES do.
export const ITEM_GOODS = ['bread', 'vegetables', 'fish', 'milk', 'cloth', 'tools', 'fuel'] as const;
