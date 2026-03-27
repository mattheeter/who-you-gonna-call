import { DATA_URL, /*SERVICE_TYPE*/ } from "./constants.js";

const { d3 } = window;
const parseDate = d3.utcParse("%Y %b %d %I:%M:%S %p"); // treat exported dates as calendar days so DST does not create fractional durations
const usDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
}); // shorten dates for the tooltip

function parseCoordinate(value) {
  const trimmedValue = value ? value.trim() : "";
  if (!trimmedValue) return null;

  const coordinate = Number.parseFloat(trimmedValue);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export async function loadServiceRows(service_type) {
  const rows = await d3.csv(DATA_URL);

  return rows.filter((row) => row.SR_TYPE === service_type).map((row) => {
    const createdDate = parseDate(row.DATE_CREATED);
    const updatedDate = parseDate(row.DATE_LAST_UPDATE);
    const priorityText = (row.PRIORITY || "Unknown").trim().toLowerCase(); // normalize inconsistent csv casing
    const neighborhoodText = (row.NEIGHBORHOOD || "Unknown Neighborhood").trim().toLowerCase();
    const agencyText = (row.DEPT_NAME || "Unknown Agency").trim().toLowerCase();
    const methodText = (row.METHOD_RECEIVED || "Unknown").trim().toLowerCase();

    return {
      methodReceived: methodText
        ? methodText.replace(/\b[a-z]/g, (char) => char.toUpperCase())
        : "Unknown",
      srTypeDesc: row.SR_TYPE_DESC || "POTHOLE, REPAIR",
      priority: priorityText ? priorityText.replace(/\b[a-z]/g, (char) => char.toUpperCase()) : "Unknown",
      neighborhood: neighborhoodText
        ? neighborhoodText.replace(/\b[a-z]/g, (char) => char.toUpperCase())
        : "Unknown Neighborhood",
      agency: agencyText ? agencyText.replace(/\b[a-z]/g, (char) => char.toUpperCase()) : "Unknown Agency",
      createdDateLabel: usDateFormatter.format(createdDate),
      updatedDateLabel: usDateFormatter.format(updatedDate),
      responseTimeDays:
        !createdDate || !updatedDate
          ? null
          : Math.max(0, (updatedDate - createdDate) / (1000 * 60 * 60 * 24)), // clamp bad negative durations
      latitude: parseCoordinate(row.LATITUDE),
      longitude: parseCoordinate(row.LONGITUDE)
    };
  });
}
