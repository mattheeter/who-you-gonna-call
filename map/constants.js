export const SERVICE_TYPE = "PTHOLE";
export const DATA_URL = encodeURI(
  "./data/Cincinnati_311_(Non-Emergency)_Service_Requests_20260227.csv"
);
export const CINCINNATI_CENTER = [39.143, -84.53];
export const DEFAULT_ZOOM = 12;
export const MISSING_VALUE_COLOR = "#94a3b8";
export const UNKNOWN_CATEGORY_COLOR = MISSING_VALUE_COLOR;
export const HIGHLIGHT_FILL_OPACITY = 0.84;
export const HIGHLIGHT_STROKE_OPACITY = 0.9;
export const COLOR_BY_OPTIONS = [
  { value: "responseTimeDays", label: "Resolution time" },
  { value: "neighborhood", label: "Neighborhood" },
  { value: "priority", label: "Priority" },
  { value: "agency", label: "Public agency" }
];
