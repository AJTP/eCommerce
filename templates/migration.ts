import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  // Write migrations here
};

export const down = (pgm: MigrationBuilder): void => {
  // Write rollbacks here
};
