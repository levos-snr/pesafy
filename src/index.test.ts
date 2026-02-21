import { expect, test } from "bun:test";
import { Mpesa, PesafyError } from "./index";
import type { MpesaConfig } from "./mpesa/types";

test("Mpesa class can be instantiated", () => {
  const config: MpesaConfig = {
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "sandbox",
  };

  const mpesa = new Mpesa(config);
  expect(mpesa).toBeInstanceOf(Mpesa);
});

test("Mpesa class initializes with correct environment", () => {
  const config: MpesaConfig = {
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "production",
  };

  const mpesa = new Mpesa(config);
  expect(mpesa).toBeInstanceOf(Mpesa);
});

test("PesafyError has correct structure", () => {
  const err = new PesafyError({
    code: "VALIDATION_ERROR",
    message: "Test error",
  });
  expect(err).toBeInstanceOf(PesafyError);
  expect(err).toBeInstanceOf(Error);
  expect(err.code).toBe("VALIDATION_ERROR");
  expect(err.message).toBe("Test error");
});
