export interface IValueObject<T> {
  readonly value: T;

  getValue(): T;
}
