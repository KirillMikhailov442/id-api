import { randomUUID } from "node:crypto";
import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const ENTITY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EntityId<T extends string> implements IValueObject<string> {
  private constructor(
    public readonly value: string,
    private readonly entityType: T
  ) {
    if (typeof value !== "string" || !ENTITY_ID_PATTERN.test(value)) {
      throw new InvalidValueObjectException(`${entityType} ID must be a UUID`);
    }

    this.value = value.toLowerCase();

    Object.freeze(this);
  }

  static forEntity<T extends string>(entityType: T) {
    return Object.freeze({
      from: (value: string): EntityId<T> => new EntityId(value, entityType),
      create: (): EntityId<T> => new EntityId(randomUUID(), entityType),
    });
  }

  getValue(): string {
    return this.value;
  }

  equals(other: EntityId<T>): boolean {
    return this.entityType === other.entityType && this.value === other.value;
  }
}
