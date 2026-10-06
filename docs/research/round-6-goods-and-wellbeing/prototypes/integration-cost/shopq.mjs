// Dense ring of households waiting to shop; inShopQ keeps each household in it at most once.
let shopQ, inShopQ, qState, H = 0;

export function bindShopQ(w) { shopQ = w.shopQ; inShopQ = w.inShopQ; qState = w.qState; H = w.H; }

export function enqueueShop(h) {
  if (inShopQ[h] !== 0) return;
  inShopQ[h] = 1;
  let tail = qState[1];
  shopQ[tail] = h;
  tail++; if (tail === H) tail = 0;
  qState[1] = tail; qState[2]++;
}

export function dequeueShop() {
  if (qState[2] === 0) return -1;
  let head = qState[0];
  const h = shopQ[head];
  head++; if (head === H) head = 0;
  qState[0] = head; qState[2]--;
  inShopQ[h] = 0;
  return h;
}
