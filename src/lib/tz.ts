import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_TZ, isValidTz } from "./time";

export async function getTz() {
  const tz = (await cookies()).get("tz")?.value;
  return isValidTz(tz) ? tz : DEFAULT_TZ;
}
