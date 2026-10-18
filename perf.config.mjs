export const settings = {
  cpuThrottling: 4,
  renderRuns: 9,
  interactionCycles: 15,
  leakWarmup: 30,
  leakCycles: 100,
  scaleSize: 1000,
};

export const cycles = {
  accordion: {
    setup: [],
    actions: [
      { name: 'open Returns', click: 'role=button[name="Returns"]' },
      { name: 'open Shipping', click: 'role=button[name="Shipping"]' },
    ],
  },
  tabs: {
    setup: [{ click: 'role=tab[name="Profile"]' }],
    actions: [
      { name: 'ArrowRight', press: 'ArrowRight' },
      { name: 'ArrowLeft', press: 'ArrowLeft' },
    ],
  },
  menu: {
    setup: [],
    actions: [
      { name: 'open', click: 'role=button[name="Actions"]' },
      { name: 'Escape', press: 'Escape' },
    ],
  },
  listbox: {
    setup: [],
    actions: [
      { name: 'select Cherry', click: 'role=option[name="Cherry"]' },
      { name: 'select Banana', click: 'role=option[name="Banana"]' },
    ],
  },
  combobox: {
    setup: [{ click: 'role=combobox[name="Fruit"]' }],
    actions: [
      { name: 'type a', press: 'a' },
      { name: 'Backspace', press: 'Backspace' },
    ],
  },
  dialog: {
    setup: [],
    actions: [
      { name: 'open', click: 'role=button[name="Open dialog"]' },
      { name: 'Escape', press: 'Escape' },
    ],
  },
};

export const scale = {
  listbox: {
    setup: [{ click: 'role=option[name="Apple"]' }],
    actions: [
      { name: 'ArrowDown', press: 'ArrowDown' },
      { name: 'ArrowUp', press: 'ArrowUp' },
    ],
  },
  combobox: {
    setup: [{ click: 'role=combobox[name="Fruit"]' }],
    actions: [
      { name: 'type 5', press: '5' },
      { name: 'Backspace', press: 'Backspace' },
    ],
  },
};
