import { registerDecorator, type ValidationArguments, type ValidationOptions } from "class-validator";

export function IsDifferentFrom(property: string, validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: "isDifferentFrom",
      target: target.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const otherValue = (args.object as Record<string, unknown>)[property];

          return value !== otherValue;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be different from ${property}`;
        },
      },
    });
  };
}
