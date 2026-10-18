import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("products", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: {
      type: "varchar(50)",
      notNull: true,
    },
    description: {
      type: "varchar(255)",
      notNull: true,
    },
    price: {
      type: "decimal(10,2)",
      notNull: true,
    },
    stock: {
      type: "integer",
      notNull: true,
      default: 0,
      check: "stock >= 0",
    },
    rating: {
      type: "integer",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    deleted_at: {
      type: "timestamptz",
    },
    created_by: {
      type: "uuid",
      notNull: true,
      references: "users",
    },
  });

  pgm.createIndex("products", "created_by");

  pgm.createTable(
    "cart_items",
    {
      user_id: {
        type: "uuid",
        notNull: true,
        references: "users",
        onDelete: "CASCADE",
      },
      product_id: {
        type: "uuid",
        notNull: true,
        references: "products",
        onDelete: "CASCADE",
      },
      quantity: {
        type: "integer",
        notNull: true,
      },
      created_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
    },
    {
      constraints: {
        primaryKey: ["user_id", "product_id"],
      },
    },
  );
  pgm.createIndex("cart_items", "product_id");

  pgm.createType("order_status", ["pending", "completed", "cancelled"]);

  pgm.createTable("orders", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      references: "users",
      onDelete: "SET NULL",
    },
    total_amount: {
      type: "decimal(10,2)",
      notNull: true,
    },
    status: {
      type: "order_status",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("orders", "user_id");

  pgm.createTable(
    "order_items",
    {
      order_id: {
        type: "uuid",
        references: "orders",
        notNull: true,
        onDelete: "CASCADE",
      },
      product_id: {
        type: "uuid",
        references: "products",
        notNull: true,
        onDelete: "RESTRICT",
      },
      quantity: {
        type: "integer",
        notNull: true,
      },
      unit_price: {
        type: "decimal(10,2)",
        notNull: true,
      },
    },
    {
      constraints: {
        primaryKey: ["order_id", "product_id"],
      },
    },
  );

  pgm.createIndex("order_items", "product_id");

  pgm.createTable(
    "product_reviews",
    {
      id: {
        type: "uuid",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      user_id: {
        type: "uuid",
        references: "users",
        notNull: true,
        onDelete: "CASCADE",
      },
      product_id: {
        type: "uuid",
        references: "products",
        notNull: true,
        onDelete: "CASCADE",
      },
      rating: {
        type: "integer",
        notNull: true,
      },
      title: {
        type: "varchar(50)",
        notNull: true,
      },
      content: {
        type: "text",
        notNull: true,
      },
      created_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
      updated_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
    },
    {
      constraints: {
        unique: ["user_id", "product_id"],
      },
    },
  );

  pgm.createIndex("product_reviews", "product_id");
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("cart_items");
  pgm.dropTable("order_items");
  pgm.dropTable("orders");
  pgm.dropType("order_status");
  pgm.dropIndex("product_reviews", "product_id");
  pgm.dropTable("product_reviews");
  pgm.dropTable("products");
};
