import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

// Swap this for a real provider (e.g. Stripe) when going live.
export const paymentProvider: PaymentProvider = mockProvider;

export const IS_TEST_MODE = paymentProvider.name === "mock";

export type { CardInput } from "./types";
