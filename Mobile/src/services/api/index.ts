import { environment } from "../../config/environment";
import { ApiClient } from "./client";
let currentToken: string | null = null;
let unauthorized: () => void = () => {};
export const tokenSession = {
  get: () => currentToken,
  set: (value: string | null) => {
    currentToken = value;
  },
  setUnauthorizedHandler: (handler: () => void) => {
    unauthorized = handler;
  },
};
export const api = new ApiClient(environment.apiUrl, {
  get: tokenSession.get,
  onUnauthorized: () => unauthorized(),
});
