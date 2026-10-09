// Copyright 2018 Google LLC
// SPDX-License-Identifier: Apache-2.0
// Lighthouse's computeBenchmarkIndex, from core/lib/page-functions.js in https://github.com/GoogleChrome/lighthouse,
// under the Apache License 2.0 (LICENSE-lighthouse.txt, beside this file). Ported to TypeScript with its logic
// unchanged, so the index keeps Lighthouse's device brackets, where about 375 is a mid-tier phone (R5 load notes §2).
// page.evaluate sends it to the page as source text, so it must stay self-contained.
export function computeBenchmarkIndex(): number {
  // GC-heavy: builds a 10,000-character string for 500 ms. Dividing by 10 keeps the magnitude of Lighthouse's earlier
  // 100,000-character version.
  function benchmarkIndexGC(): number {
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < 500) {
      let s = '';
      for (let j = 0; j < 10000; j++) s += 'a';
      if (s.length === 1) throw new Error('will never happen, but prevents compiler optimizations');
      iterations++;
    }
    const durationInSeconds = (Date.now() - start) / 1000;
    return Math.round(iterations / 10 / durationInSeconds);
  }

  // GC-free: copies 100,000 integers between two arrays for 500 ms. It reads the clock on every tenth iteration only,
  // which avoids a performance cliff on some Intel CPUs (V8 issue 10954).
  function benchmarkIndexNoGC(): number {
    const arrA: number[] = [];
    const arrB: number[] = [];
    for (let i = 0; i < 100000; i++) arrA[i] = arrB[i] = i;
    const start = Date.now();
    let iterations = 0;
    while (iterations % 10 !== 0 || Date.now() - start < 500) {
      const src = iterations % 2 === 0 ? arrA : arrB;
      const tgt = iterations % 2 === 0 ? arrB : arrA;
      for (let j = 0; j < src.length; j++) tgt[j] = src[j];
      iterations++;
    }
    const durationInSeconds = (Date.now() - start) / 1000;
    return Math.round(iterations / 10 / durationInSeconds);
  }

  return (benchmarkIndexGC() + benchmarkIndexNoGC()) / 2;
}
