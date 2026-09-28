// A short, stable code for a candidate whose name is still hidden
// ("Candidate 3F9A2"): the first letters of the application id.
export function candidateCode(applicationId: string) {
  return applicationId.replace(/-/g, "").slice(0, 5).toUpperCase();
}
