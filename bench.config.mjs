export const libraries = [
  { id: 'forty', name: 'forty-cdk', packages: ['forty-cdk'] },
  { id: 'ng-primitives', name: 'ng-primitives', packages: ['ng-primitives'] },
  { id: 'angular-aria', name: 'Angular Aria', packages: ['@angular/aria', '@angular/cdk'] },
  { id: 'angular-cdk', name: 'Angular CDK', packages: ['@angular/cdk'] },
  { id: 'spartan', name: 'Spartan (brain)', packages: ['@spartan-ng/brain', '@angular/cdk'] },
];

export const patterns = [
  {
    id: 'accordion',
    name: 'Accordion',
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/accordion/',
    probe: [
      { expect: 'role=button[name="Shipping"][expanded=true]', count: 1 },
      { click: 'role=button[name="Returns"]' },
      { expect: 'role=button[name="Returns"][expanded=true]', count: 1 },
      { expect: 'role=button[name="Shipping"][expanded=false]', count: 1 },
      { text: 'output', equals: 'returns' },
    ],
  },
  {
    id: 'tabs',
    name: 'Tabs',
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
    probe: [
      { expect: 'role=tablist[name="Account settings"] >> role=tab', count: 3 },
      { expect: 'role=tab[name="Profile"][selected=true]', count: 1 },
      { click: 'role=tab[name="Profile"]' },
      { press: 'ArrowRight' },
      { expect: 'role=tab[name="Security"][selected=true]', count: 1 },
      { expect: 'role=tabpanel', count: 1 },
      { text: 'output', equals: 'security' },
    ],
  },
  {
    id: 'menu',
    name: 'Menu button',
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/',
    probe: [
      { expect: 'role=menu', count: 0 },
      { click: 'role=button[name="Actions"]' },
      { expect: 'role=menu >> role=menuitem', count: 3 },
      { click: 'role=menuitem[name="Duplicate"]' },
      { expect: 'role=menu', count: 0 },
      { text: 'output', equals: 'Duplicate' },
    ],
  },
  {
    id: 'listbox',
    name: 'Listbox',
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
    probe: [
      { expect: 'role=listbox[name="Fruits"] >> role=option', count: 5 },
      { click: 'role=option[name="Cherry"]' },
      { expect: 'role=option[name="Cherry"][selected=true]', count: 1 },
      { text: 'output', equals: 'cherry' },
    ],
  },
  {
    id: 'combobox',
    name: 'Combobox',
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
    probe: [
      { expect: 'role=combobox[name="Fruit"]', count: 1 },
      { click: 'role=combobox[name="Fruit"]' },
      { type: 'an' },
      { expect: 'role=option', count: 2 },
      { click: 'role=option[name="Mango"]' },
      { text: 'output', equals: 'mango' },
    ],
  },
  {
    id: 'dialog',
    name: 'Dialog (modal)',
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    probe: [
      { expect: 'role=dialog', count: 0 },
      { click: 'role=button[name="Open dialog"]' },
      { expect: 'role=dialog[name="Delete file?"]', count: 1 },
      { press: 'Escape' },
      { expect: 'role=dialog', count: 0 },
      { focused: 'role=button[name="Open dialog"]' },
      { click: 'role=button[name="Open dialog"]' },
      { click: 'role=button[name="Delete"]' },
      { expect: 'role=dialog', count: 0 },
      { text: 'output', equals: 'deleted' },
    ],
  },
];

export const unsupported = {};
