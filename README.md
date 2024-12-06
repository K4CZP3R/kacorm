# kacorm

> Simple, not ready to use ORM for bun

Prisma is too complicated and does not work out of the box with Zod. This is a simple ORM which relies on Zod to validate the data.

## ZodFeatures

ZodFeatures is a utility that helps define special column behaviors using Zod's describe() method. Here are the available features:

### Primary Key

```ts
z.number().describe(ZodFeatures.primary);
```

Marks a field as the primary key. Each table must have exactly one primary key.

### Unique Constraint

```ts
z.string().describe(ZodFeatures.unique);
```

Makes a field unique across the table. No two rows can have the same value in this field.

### Named Uniqueness Groups

```ts
z.string().describe(ZodFeatures.namedUniqueness("group_name"));
```

Creates a compound unique constraint with other fields sharing the same group name. For example, in the User schema above, `first_name` and `last_name` together must be unique since they share the "names" group.

## Example

```ts
import { z } from "zod";
import Container, { Service } from "typedi";
import { Database } from "bun:sqlite";
import { BaseRepository, ZodFeatures } from "kacorm";

const UserCreate = z.object({
  email: z.string().email().describe(ZodFeatures.unique),
  hashed_password: z.string(),
  first_name: z.string().describe(ZodFeatures.namedUniqueness("names")),
  last_name: z.string().describe(ZodFeatures.namedUniqueness("names")),
});
const User = UserCreate.extend({
  id: z.number().describe(ZodFeatures.primary),
  created_at: z
    .string()
    .default("CURRENT_TIMESTAMP")
    .transform((v) => new Date(v)),
  updated_at: z
    .string()
    .default("CURRENT_TIMESTAMP")
    .transform((v) => new Date(v)),
});
type User = z.infer<typeof User>;
type UserCreate = z.infer<typeof UserCreate>;

@Service()
export class UserRepository extends BaseRepository<
  typeof User,
  typeof UserCreate
> {
  constructor() {
    super(Database, "users", User, UserCreate);
  }
}
```

### Usage

```ts
const repo = Container.get(UserRepository);

const created = repo.create({
  email: "test@test.com",
  hashed_password: "lol",
  first_name: "Kacper",
  last_name: "Test",
});
const created2 = repo.create({
  email: "test@test.csom",
  hashed_password: "lol",
  first_name: "Someone Else",
  last_name: "Yes yes",
});

console.log(repo.getAllWhere({ first_name: "Kacper" }));
```
