import { SERVICE_TYPES } from "./constants.js";

const { L } = window;

export function createServiceTypeSelectorControl({ map, onSelectionChange, initialSelected = [] }) {
  const control = L.control({ position: "topright" });

  control.onAdd = function () {
    const container = L.DomUtil.create("div", "service-type-selector leaflet-control");

    // Button to toggle the panel
    const button = L.DomUtil.create("button", "service-type-toggle", container);
    button.textContent = "Service Type Selector";
    button.setAttribute("aria-label", "Toggle service type visibility");

    // Panel with checkboxes
    const panel = L.DomUtil.create("div", "service-type-panel", container);
    panel.style.display = "none";

    // Select all / Deselect all buttons
    const selectAllBtn = L.DomUtil.create("button", "select-all-btn", panel);
    selectAllBtn.textContent = "Select All";
    const deselectAllBtn = L.DomUtil.create("button", "deselect-all-btn", panel);
    deselectAllBtn.textContent = "Deselect All";

    const checkboxes = [];

    SERVICE_TYPES.forEach((type) => {
      const label = L.DomUtil.create("label", "service-type-label", panel);
      const checkbox = L.DomUtil.create("input", "", label);
      checkbox.type = "checkbox";
      checkbox.value = type.value;
      checkbox.checked = initialSelected.includes(type.value);
      label.appendChild(document.createTextNode(` ${type.label}`));
      checkboxes.push(checkbox);
    });

    // Event listeners
    L.DomEvent.on(button, "click", (e) => {
      L.DomEvent.stop(e);
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    const updateSelection = () => {
      const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
      onSelectionChange(selected);
    };

    checkboxes.forEach((checkbox) => {
      L.DomEvent.on(checkbox, "change", updateSelection);
    });

    L.DomEvent.on(selectAllBtn, "click", (e) => {
      L.DomEvent.stop(e);
      checkboxes.forEach(cb => cb.checked = true);
      updateSelection();
    });

    L.DomEvent.on(deselectAllBtn, "click", (e) => {
      L.DomEvent.stop(e);
      checkboxes.forEach(cb => cb.checked = false);
      updateSelection();
    });

    L.DomEvent.disableClickPropagation(container);

    // Initial call
    updateSelection();

    return container;
  };

  return control;
}