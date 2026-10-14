import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: { type: "varchar(120)", notNull: true },
    email: { type: "varchar(255)", notNull: true, unique: true },
    avatar_url: { type: "varchar(500)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Una fila por cada proveedor de identidad (Google, y en el futuro
  // cualquier otro) que un usuario haya vinculado a su cuenta.
  pgm.createTable("identities", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    provider: { type: "varchar(50)", notNull: true },
    provider_user_id: { type: "varchar(255)", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("identities", "identities_provider_provider_user_id_unique", {
    unique: ["provider", "provider_user_id"],
  });

  pgm.createIndex("identities", "user_id");

  // Refresh tokens opacos (no JWT) para poder revocarlos/rotarlos;
  // independientes del proveedor de identidad usado para el login.
  pgm.createTable("refresh_tokens", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    token_hash: { type: "varchar(64)", notNull: true, unique: true },
    expires_at: { type: "timestamptz", notNull: true },
    revoked_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("refresh_tokens", "user_id");
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("refresh_tokens");
  pgm.dropTable("identities");
  pgm.dropTable("users");
};
