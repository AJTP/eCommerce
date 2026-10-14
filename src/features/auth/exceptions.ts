import { AppException } from "../../shared/exceptions/app-exception.js";

export class UnverifiedEmailError extends AppException {
  constructor(provider: string) {
    super(`Email not verified by provider '${provider}'`, 401);
  }
}
