import { z } from "zod";
import type { Database } from "bun:sqlite";
import {
  fieldToSql,
  uniqueConstraintsToSql,
  whereToSql,
  zodToDatabase,
  ZodFeatures,
} from "./helper";

export { ZodFeatures };

export class BaseRepository<
  T extends z.ZodObject<any>,
  V extends z.ZodObject<any>
> {
  getAll(): z.infer<T>[] {
    const query = this.database.query(`SELECT * FROM ${this.name}`);

    return query.all().map((item) => this.schema.parse(item));
  }

  getAllWhere(where: Partial<z.infer<T>>): z.infer<T>[] {
    const query = this.database
      .query(`SELECT * FROM ${this.name} WHERE ${whereToSql(where)}`)
      .all(where as Record<string, string | number | boolean | null>);

    return query.map((item) => this.schema.parse(item));
  }
  getById(id: number | bigint): z.infer<T> | null {
    const query = this.database
      .query(`SELECT * FROM ${this.name} WHERE id = $id`)
      .get({ id });

    if (!query) {
      return null;
    }

    return this.schema.parse(query);
  }

  create(data: z.infer<V>): z.infer<T> {
    const rawQuery = `INSERT INTO ${this.name} (${Object.keys(data).join(
      ","
    )}) VALUES (${Object.keys(data)
      .map((a) => "$" + a)
      .join(",")})`;

    const query = this.database.query(rawQuery).run(data);

    return this.getById(query.lastInsertRowid)!;
  }

  constructor(
    private database: Database,
    private name: string,
    private schema: T,
    private createSchema: V
  ) {
    const [fields, uniqueConstraints] = zodToDatabase(schema);
    const fieldsSQL = fields.map(fieldToSql).join(",");

    const uniqueSQL = uniqueConstraints
      .map((constraint) => uniqueConstraintsToSql(constraint))
      .join(",");

    const sql = `CREATE TABLE IF NOT EXISTS ${name} (
      ${fieldsSQL}
      ${uniqueConstraints.length ? "," + uniqueSQL : ""}
    )`;

    this.database.query(sql).run();
  }
}
