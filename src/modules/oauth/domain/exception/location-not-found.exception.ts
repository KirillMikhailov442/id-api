export class LocationNotFoundException extends Error {
  constructor(message = "Location not found") {
    super(message);
    this.name = "LocationNotFoundException";
  }
}
