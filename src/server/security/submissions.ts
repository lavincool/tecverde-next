/** Kill switch for anonymous writes. Any value other than "false" keeps submissions open. */
export function publicSubmissionsEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  return environment.PUBLIC_SUBMISSIONS_ENABLED !== "false";
}
