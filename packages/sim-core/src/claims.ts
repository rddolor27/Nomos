import { transfer, type Ledger } from './ledger.ts';
import { take, type Arena } from './memory.ts';
import { mulPpm } from './money.ts';

export interface Claims {
  readonly capacity: number;
  readonly count: Int32Array;
  readonly lender: Int32Array;
  readonly borrower: Int32Array;
  readonly ratePpm: Int32Array;
  readonly principal: Float64Array;
  readonly payment: Float64Array;
  readonly debt: Float64Array;
  readonly lent: Float64Array;
}

export function createClaims(arena: Arena, cash: Ledger, capacity: number): Claims {
  return {
    capacity,
    count: take(arena, Int32Array, 1, true),
    lender: take(arena, Int32Array, capacity, true),
    borrower: take(arena, Int32Array, capacity, true),
    ratePpm: take(arena, Int32Array, capacity, true),
    principal: take(arena, Float64Array, capacity, true),
    payment: take(arena, Float64Array, capacity, true),
    debt: take(arena, Float64Array, cash.accounts, true),
    lent: take(arena, Float64Array, cash.accounts, true),
  };
}

// Loans are append-only until M2 needs slot reuse. A full ledger throws before any cent moves.
export function openLoan(
  claims: Claims,
  cash: Ledger,
  lender: number,
  borrower: number,
  principal: number,
  ratePpm: number,
  payment: number,
): number {
  const loan = claims.count[0];
  if (loan >= claims.capacity) throw new RangeError('the claims ledger is full');
  claims.lender[loan] = lender;
  claims.borrower[loan] = borrower;
  claims.ratePpm[loan] = ratePpm;
  claims.principal[loan] = principal;
  claims.payment[loan] = payment;
  claims.debt[borrower] += principal;
  claims.lent[lender] += principal;
  claims.count[0] = loan + 1;
  transfer(cash, lender, borrower, principal);
  return loan;
}

// Interest is capitalised: the claim grows on both sides and no cash moves until an instalment is paid.
export function accrue(claims: Claims, loan: number): number {
  const interest = mulPpm(claims.principal[loan], claims.ratePpm[loan]);
  claims.principal[loan] += interest;
  claims.debt[claims.borrower[loan]] += interest;
  claims.lent[claims.lender[loan]] += interest;
  return interest;
}

export function payInstalment(claims: Claims, cash: Ledger, loan: number): number {
  const borrower = claims.borrower[loan];
  const lender = claims.lender[loan];
  const paid = Math.min(claims.payment[loan], claims.principal[loan]);
  transfer(cash, borrower, lender, paid);
  claims.principal[loan] -= paid;
  claims.debt[borrower] -= paid;
  claims.lent[lender] -= paid;
  return paid;
}
