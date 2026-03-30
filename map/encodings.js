import { MISSING_VALUE_COLOR, SERVICE_TYPES, UNKNOWN_CATEGORY_COLOR } from "./constants.js";

const { d3 } = window;
const RESPONSE_MODE = "responseTimeDays";
const MISSING_RESPONSE_KEY = "missing";
const MISSING_RESPONSE_LABEL = "Unavailable";
const RESPONSE_PERCENTILES = [0.2, 0.4, 0.6, 0.85, 0.93, 0.97, 0.995]; // lean on percentiles so long tails do not flatten the map
const RESPONSE_THEME_COLORS = d3.schemeYlOrBr[8];
const CATEGORY_THEME_COLORS = [
  ...d3.schemeTableau10,
  ...d3.schemeSet3,
  ...d3.schemePaired,
  ...d3.schemeSet2,
  ...d3.schemeAccent,
  ...d3.schemeDark2
];

function sortedDistinct(rows, key) {
  const uniqueValues = new Set();
  rows.forEach((row) => {
    uniqueValues.add(row[key]);
  });

  const sortedValues = [];
  uniqueValues.forEach((value) => {
    sortedValues.push(value);
  });
  return sortedValues.sort();
}

function buildOrdinalScale(domain, overrides = {}, palette = CATEGORY_THEME_COLORS) {
  const defaultDomain = domain.filter((value) => !overrides[value]);
  let colorIndex = 0;

  return d3.scaleOrdinal(
    domain,
    domain.map((value) => overrides[value] || palette[colorIndex++ % palette.length]) // reuse fixed theme colors instead of generating new ones
  );
}

const CATEGORY_MODE_CONFIG = {
  neighborhood: {
    scaleKey: "neighborhoodScale",
    rowKey: "neighborhood",
    buildScale(mappedRows) {
      return buildOrdinalScale(sortedDistinct(mappedRows, "neighborhood"), {
        "Unknown Neighborhood": UNKNOWN_CATEGORY_COLOR
      });
    }
  },
  priority: {
    scaleKey: "priorityScale",
    rowKey: "priority",
    buildScale() {
      return d3.scaleOrdinal(
        ["Standard", "Priority", "Hazardous", "Unknown"],
        ["#fef3c7", "#f59e0b", "#991b1b", UNKNOWN_CATEGORY_COLOR]
      );
    }
  },
  agency: {
    scaleKey: "agencyScale",
    rowKey: "agency",
    buildScale(mappedRows) {
      return buildOrdinalScale(sortedDistinct(mappedRows, "agency"), {
        "Public Services": "#60a5fa",
        "Unknown Agency": UNKNOWN_CATEGORY_COLOR
      });
    }
  },
  serviceType: {
    scaleKey: "serviceTypeScale",
    rowKey: "serviceType",
    buildScale(mappedRows) {
      return buildOrdinalScale(sortedDistinct(mappedRows, "serviceType"));
    }
  }
};

function formatDayRangeLabel(lower, upper) {
  if (upper === null) return `${lower}+ ${lower === 1 ? "day" : "days"}`; // open ended final bucket

  if (lower === upper) {
    return `${lower} ${lower === 1 ? "day" : "days"}`;
  }

  return `${lower}-${upper} days`;
}

function buildResponseLegendEntries(scales, includeMissing) {
  const thresholdEntries = [];
  scales.responseScale.range().forEach((color, index) => {
    const extent = scales.responseBinExtents[index];
    if (!extent) return;

    thresholdEntries.push({
      key: `bin:${index}`,
      color,
      label: formatDayRangeLabel(extent.lower, extent.upper)
    });
  });

  if (!includeMissing) return thresholdEntries;

  const entries = thresholdEntries.slice();
  entries.push({
    key: MISSING_RESPONSE_KEY,
    color: MISSING_VALUE_COLOR,
    label: MISSING_RESPONSE_LABEL
  });
  return entries;
}

function buildCategoryLegendEntries(mode, scales) {
  const categoryScale = scales[CATEGORY_MODE_CONFIG[mode].scaleKey];
  return categoryScale.domain().map((name) => ({
    key: `cat:${name}`,
    color: categoryScale(name),
    label: mode === "serviceType"
      ? (SERVICE_TYPES.find((serviceType) => serviceType.value === name)?.label || name)
      : name
  }));
}

function buildResponseEncodings(mappedRows) {
  const responseValues = mappedRows
    .map((row) => row.responseTimeDays)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
  const responseThresholds = RESPONSE_PERCENTILES
    .map((percentile) => d3.quantileSorted(responseValues, percentile)) // sample cut points from the sorted response times
    .filter((value, index, values) => index === 0 || value > values[index - 1]); // drop duplicate thresholds when the data clusters tightly

  const responseBinExtents = [];
  for (let index = 0; index < responseThresholds.length + 1; index += 1) {
    responseBinExtents.push(null);
  }

  responseValues.forEach((value) => {
    const binIndex = d3.bisectRight(responseThresholds, value); // match each row to the same threshold bin used in the legend
    const extent = responseBinExtents[binIndex];

    if (extent) {
      extent.lower = Math.min(extent.lower, value);
      extent.upper = Math.max(extent.upper, value);
      return;
    }

    responseBinExtents[binIndex] = { lower: value, upper: value };
  });

  return {
    responseScale: d3
      .scaleThreshold()
      .domain(responseThresholds)
      .range(RESPONSE_THEME_COLORS.slice(RESPONSE_THEME_COLORS.length - (responseThresholds.length + 1))), // keep color steps aligned with threshold count using fixed theme colors
    responseThresholds,
    responseBinExtents
  };
}

function buildScales(mappedRows) {
  const scales = buildResponseEncodings(mappedRows);
  Object.keys(CATEGORY_MODE_CONFIG).forEach((mode) => {
    const config = CATEGORY_MODE_CONFIG[mode];
    scales[config.scaleKey] = config.buildScale(mappedRows); // precompute scales once during startup
  });
  return scales;
}

function buildPointEncoding(mode, row, scales) {
  if (mode === RESPONSE_MODE) {
    if (row.responseTimeDays === null) {
      return {
        row,
        legendKey: MISSING_RESPONSE_KEY,
        fillColor: MISSING_VALUE_COLOR // missing dates stay neutral instead of entering a bin
      };
    }

    return {
      row,
      legendKey: `bin:${d3.bisectRight(scales.responseThresholds, row.responseTimeDays)}`, // line up row filtering with legend bucket ids
      fillColor: scales.responseScale(row.responseTimeDays)
    };
  }

  const categoryConfig = CATEGORY_MODE_CONFIG[mode];
  const categoryValue = row[categoryConfig.rowKey];
  return {
    row,
    legendKey: `cat:${categoryValue}`,
    fillColor: scales[categoryConfig.scaleKey](categoryValue)
  };
}

function buildLegendEntries(mode, scales, pointEncodings) {
  if (mode === RESPONSE_MODE) {
    return buildResponseLegendEntries(
      scales,
      pointEncodings.some((pointEncoding) => pointEncoding.legendKey === MISSING_RESPONSE_KEY)
    );
  }

  return buildCategoryLegendEntries(mode, scales);
}

function addLegendCounts(entries, pointEncodings) {
  const countsByKey = pointEncodings.reduce((counts, pointEncoding) => {
    counts.set(pointEncoding.legendKey, (counts.get(pointEncoding.legendKey) || 0) + 1);
    return counts;
  }, new Map());

  return entries.map((entry) => {
    const countedEntry = {
      key: entry.key,
      color: entry.color,
      label: entry.label,
      count: countsByKey.get(entry.key) || 0
    };

    return countedEntry;
  });
}

export function createEncodingModel(rows) {
  const scales = buildScales(rows);
  const mappedCount = rows.reduce(
    (count, row) => count + (row.latitude !== null && row.longitude !== null ? 1 : 0),
    0
  );
  const unmappedCount = rows.length - mappedCount;

  return {
    getModeState(mode) {
      const pointEncodings = rows.map((row) => buildPointEncoding(mode, row, scales));
      // Count every row in the current encoding mode before applying active legend filters so the legend still reflects the full distribution users can toggle back on.
      const entries = addLegendCounts(buildLegendEntries(mode, scales, pointEncodings), pointEncodings);

      return {
        entries,
        points: pointEncodings,
        mappedCount,
        unmappedCount,
        totalCount: rows.length
      };
    }
  };
}
