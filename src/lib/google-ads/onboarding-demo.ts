export type OnboardingDemoEntry =
  | {
      isDemo: true;
      mode: "test";
      clientId: "google-ads-sandbox";
    }
  | {
      isDemo: false;
      mode: "test";
      clientId?: never;
    };

const NORMAL_ENTRY: OnboardingDemoEntry = {
  isDemo: false,
  mode: "test",
};

const VALID_PERCENT_ENCODING = /%(?:[0-9A-Fa-f]{2})/g;

function hasMalformedEncoding(search: string): boolean {
  return search.replace(VALID_PERCENT_ENCODING, "").includes("%");
}

export function resolveOnboardingDemoEntry(search: string): OnboardingDemoEntry {
  if (!search || hasMalformedEncoding(search)) return NORMAL_ENTRY;

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const demoValues = params.getAll("demo");
  const modeValues = params.getAll("mode");
  const clientIdValues = params.getAll("clientId");

  if (
    demoValues.length !== 1 ||
    modeValues.length !== 1 ||
    clientIdValues.length !== 1 ||
    demoValues[0] !== "1" ||
    modeValues[0] !== "test" ||
    clientIdValues[0] !== "google-ads-sandbox"
  ) {
    return NORMAL_ENTRY;
  }

  return {
    isDemo: true,
    mode: "test",
    clientId: "google-ads-sandbox",
  };
}
