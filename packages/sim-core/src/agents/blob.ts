import type { Ledger } from '../money/ledger.ts';
import type { AgentStore } from './store.ts';

// One handle per world, re-pointed by at(), so a blob's values stay in the arena and no object is made per blob (owner,
// 9 October 2026).
export class Blob {
  private readonly xColumn: Int32Array;
  private readonly yColumn: Int32Array;
  private readonly vxColumn: Int16Array;
  private readonly vyColumn: Int16Array;
  private readonly headingColumn: Uint8Array;
  private readonly actionColumn: Uint8Array;
  private readonly facingColumn: Uint8Array;
  private readonly nameKeyColumn: Uint32Array;
  private readonly employerColumn: Int32Array;
  private readonly balance: Float64Array;
  private readonly firstWallet: number;
  private row = 0;

  constructor(agents: AgentStore, cash: Ledger) {
    this.xColumn = agents.x;
    this.yColumn = agents.y;
    this.vxColumn = agents.vx;
    this.vyColumn = agents.vy;
    this.headingColumn = agents.heading;
    this.actionColumn = agents.action;
    this.facingColumn = agents.facing;
    this.nameKeyColumn = agents.nameKey;
    this.employerColumn = agents.employer;
    this.balance = cash.balance;
    this.firstWallet = cash.firstWallet;
  }

  at(index: number): void {
    this.row = index;
  }

  get index(): number {
    return this.row;
  }

  get x(): number {
    return this.xColumn[this.row];
  }

  set x(value: number) {
    this.xColumn[this.row] = value;
  }

  get y(): number {
    return this.yColumn[this.row];
  }

  set y(value: number) {
    this.yColumn[this.row] = value;
  }

  get vx(): number {
    return this.vxColumn[this.row];
  }

  set vx(value: number) {
    this.vxColumn[this.row] = value;
  }

  get vy(): number {
    return this.vyColumn[this.row];
  }

  set vy(value: number) {
    this.vyColumn[this.row] = value;
  }

  get heading(): number {
    return this.headingColumn[this.row];
  }

  set heading(value: number) {
    this.headingColumn[this.row] = value;
  }

  get action(): number {
    return this.actionColumn[this.row];
  }

  set action(value: number) {
    this.actionColumn[this.row] = value;
  }

  get facing(): number {
    return this.facingColumn[this.row];
  }

  set facing(value: number) {
    this.facingColumn[this.row] = value;
  }

  get nameKey(): number {
    return this.nameKeyColumn[this.row];
  }

  // The employing firm's row, or -1.
  get employer(): number {
    return this.employerColumn[this.row];
  }

  get wallet(): number {
    return this.firstWallet + this.row;
  }

  get cash(): number {
    return this.balance[this.firstWallet + this.row];
  }
}
