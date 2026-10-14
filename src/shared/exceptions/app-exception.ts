export class AppException extends Error {
  public name: string;

  constructor(
    message: string,
    public statusCode: number = 500,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppException.prototype);
  }
}
