import { AppException } from "../../shared/exceptions/app-exception.js";

export class UserNotFoundError extends AppException {
  constructor(userId: string) {
    super(`User not found with id '${userId}'`, 404);
  }
}
