export function mapOptional<T, R>(value: T | undefined, transform: (value: T) => R): R | undefined {
  return value === undefined ? undefined : transform(value);
}
