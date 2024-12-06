import type { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

export type FieldType = "INTEGER" | "TEXT" | "DATE";

export type Field = {
  name: string;
  type: FieldType;
  notNull?: boolean;
  primaryKey?: boolean;
  default?: string;
  unique?: boolean;
};

export type ZodType = "string" | "number";

const ZOD_FIELD_TYPE_MAP: Record<ZodType | string, FieldType> = {
  number: "INTEGER",
  string: "TEXT",
};

export const ZodFeatures = {
  unique: "unique",
  primary: "primary",
  namedUniqueness: (name: string) => `unique_${name}`,
};

type UniqueConstraint = {
  name: string;
  fields: string[];
};

export function zodToDatabase(
  schema: z.ZodObject<any>
): [Field[], UniqueConstraint[]] {
  const jsonSchema = zodToJsonSchema(schema) as { [key: string]: any };

  const fields: Field[] = [];
  const uniqueConstraints: UniqueConstraint[] = [];

  Object.entries(jsonSchema.properties).forEach(
    ([fieldName, data]: [string, any]) => {
      fields.push({
        name: fieldName,
        type: ZOD_FIELD_TYPE_MAP[data.type],
        notNull: Array.isArray(data.type) && data.type.includes("null"),
        unique: data.description?.includes(ZodFeatures.unique),
        primaryKey: data.description?.includes(ZodFeatures.primary),
        default: data.default,
      });

      (data.description?.split(",") ?? [])
        .filter((i: string) => i.startsWith(ZodFeatures.namedUniqueness("")))
        .forEach((i: string) => {
          const [_, name] = i.split("_");
          const alreadyExists = uniqueConstraints.findIndex(
            (uc) => uc.name === name
          );
          if (alreadyExists === -1) {
            uniqueConstraints.push({
              name,
              fields: [fieldName],
            });
          } else {
            uniqueConstraints[alreadyExists].fields.push(fieldName);
          }
        });
    }
  );

  return [fields, uniqueConstraints];
}

export function uniqueConstraintsToSql(uniqueConstraint: UniqueConstraint) {
  return `CONSTRAINT ${
    uniqueConstraint.name
  } UNIQUE (${uniqueConstraint.fields.join(",")})`;
}
export function fieldToSql(field: Field) {
  let sql = `${field.name} ${field.type}`;
  if (field.notNull) {
    sql += ` NOT NULL`;
  }
  if (field.primaryKey) {
    sql += ` PRIMARY KEY`;
  }
  if (field.unique) {
    sql += ` UNIQUE`; // Add this line
  }
  if (field.default) {
    sql += ` DEFAULT ${field.default}`;
  }
  return sql;
}

export function whereToSql(where: Record<string, any>) {
  if (Object.keys(where).length === 0) {
    return "1=1"; // Return true if no conditions
  }
  return Object.entries(where)
    .map(([key, value]) => {
      if (value === null) {
        return `${key} IS NULL`;
      }
      return `${key} = $${key}`;
    })
    .join(" AND ");
}
