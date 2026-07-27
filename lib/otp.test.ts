import { describe, expect, it } from "vitest";
import { normalizeOtp, otpErrorMessage } from "@/lib/otp";

describe("normalizeOtp", () => {
  it("keeps a plain 6-digit code", () => {
    expect(normalizeOtp("123456")).toBe("123456");
  });

  it("strips spaces and dashes from autofill", () => {
    expect(normalizeOtp("123 456")).toBe("123456");
    expect(normalizeOtp("123-456")).toBe("123456");
  });

  it("truncates to the configured length", () => {
    expect(normalizeOtp("1234567890")).toBe("123456");
  });

  it("drops letters and punctuation", () => {
    expect(normalizeOtp("12a34b56!")).toBe("123456");
  });
});

describe("otpErrorMessage", () => {
  it("maps Invalid OTP", () => {
    expect(otpErrorMessage("Invalid OTP")).toMatch(/Code invalide/);
  });

  it("maps expired OTP", () => {
    expect(otpErrorMessage("OTP expired")).toMatch(/expiré/i);
  });

  it("maps too many attempts", () => {
    expect(otpErrorMessage("Too many attempts")).toMatch(/Trop/);
  });

  it("uses French fallback when message is empty", () => {
    expect(otpErrorMessage(undefined)).toBe("Code invalide");
  });
});
