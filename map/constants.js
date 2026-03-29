export const SERVICE_TYPES = [
  { value: "MTL-FRN", label: "Metal, Furniture, Bulk Item Trash Pick-up"},
  { value: "PTHOLE", label: "Pothole Repair"},
  { value: "SLPYST", label: "Slippery/Icy/Snowy Streets"},
  { value: "RF-COLLT", label: "Trash Missed or Request for Collection"},
  { value: "BLD-RES", label: "Building, Residential"},
  { value: "LITR-PRV", label: "Litter, Private Property"},
  { value: "CMDVABDV", label: "Overtime Parked Vehicle"},
  { value: "TLGR-PRV", label: "Tall Grass/Weeds, Private Property"},
  { value: "311ASSIT", label: "311 Assitance"},
  { value: "STRSGN", label: "Street Sign Down/Missing"},
  { value: "TRASH-I", label: "Improper Set Out of Trash"},
  { value: "PLCJUNKV", label: "Abandoned Vehicle"},
  { value: "DAPUB1", label: "Dead Animal Removal"},
  { value: "STRTLITE", label: "Street Lighting Repair"}
]
export const DATA_URL = encodeURI(
  "./data/Cincinnati_311_(Non-Emergency)_Service_Requests_20260227.csv"
);
export const BOUNDARIES_GEOJSON_URL = "./data/cincinnati.geojson";
export const CINCINNATI_CENTER = [39.143, -84.53];
export const DEFAULT_ZOOM = 12;
export const MISSING_VALUE_COLOR = "#94a3b8";
export const UNKNOWN_CATEGORY_COLOR = MISSING_VALUE_COLOR;
export const GRAY_COLOR = "#cccccc";
export const HIGHLIGHT_FILL_OPACITY = 0.9;
export const HIGHLIGHT_STROKE_OPACITY = 0.9;
export const LOW_FILL_OPACITY = 0.1;
export const LOW_STROKE_OPACITY = 0.1;
export const COLOR_BY_OPTIONS = [
  { value: "serviceType", label: "Service type" },
  { value: "responseTimeDays", label: "Resolution time" },
  { value: "neighborhood", label: "Neighborhood" },
  { value: "priority", label: "Priority" },
  { value: "agency", label: "Public agency" }
];
