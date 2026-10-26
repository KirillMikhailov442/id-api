import { SetMetadata } from "@nestjs/common";

const IS_PUBLIC_KEY = "isPublic";

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export { IS_PUBLIC_KEY };
