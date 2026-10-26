import { DomainException } from "@shared/domain/exception/domain.exception";
import { HttpStatus } from "@shared/domain/http-status.enum";

export class LocationNotFoundException extends DomainException {
  readonly code = "LOCATION_NOT_FOUND";
  readonly status = HttpStatus.NotFound;

  constructor(message = "Location not found") {
    super(message);
    this.name = "LocationNotFoundException";
  }
}
