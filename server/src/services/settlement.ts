// Barrel: pure settlement logic lives in settlement-core (unit-tested),
// DB-dependent engine logic in settlement-db (which re-exports the core).
export * from './settlement-db';

