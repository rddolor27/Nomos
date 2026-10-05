// Godley-Lavoie model SIM (alpha1=0.6, alpha2=0.4, theta=0.2, G=20, W=1) in integer cents; government account acts as MINT.
// Own check: exact zero-sum ledger with integer flows, and convergence to the analytic steady state Y* = G/theta.
const G = 2000; // 20.00 per period in cents
let Hh = 0, gov = 0; // household cash, government (issuer) balance; invariant Hh + gov == 0
let Y = 0, rows = [];
for (let t = 1; t <= 120; t++) {
  // Y = (alpha2*Hh(-1) + G) / (1 - alpha1*(1-theta)) = (0.4*Hh + G)/0.52, solved in integers (floor)
  Y = Math.floor((Math.floor(Hh * 40 / 100) + G) * 100 / 52);
  const T = Math.floor(Y * 20 / 100), YD = Y - T, C = Y - G;      // C = alpha1*YD + alpha2*Hh(-1) up to rounding
  gov -= G; Hh += G;   // government spending creates money (wages paid for government output)
  Hh -= T; gov += T;   // taxes destroy it
  // consumption C and the private wage bill net out within households+firms (firms pass all revenue to wages)
  if (t === 1 || t === 2 || t % 20 === 0) rows.push({ t, Y_cents: Y, T, YD, C, Hh, ledgerSum: Hh + gov });
}
console.table(rows);
console.log('analytic steady state Y* = G/theta =', G / 0.2, 'cents; H* =', (1 - 0.6) * (G / 0.2) * 0.8 / 0.4, 'cents');
