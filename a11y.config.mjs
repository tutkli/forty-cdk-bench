const APG = 'https://www.w3.org/WAI/ARIA/apg';
const kbd = (pattern) => `${APG}/patterns/${pattern}/#keyboard_interaction`;
const aria = (pattern) => `${APG}/patterns/${pattern}/#roles_states_properties`;
const COMPOSITE_TAB_STOP = `${APG}/practices/keyboard-interface/#kbd_general_within`;

export const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const SECTIONS = [
  { title: 'Shipping', body: 'Orders ship within two business days.' },
  { title: 'Returns', body: 'Returns are accepted within 30 days.' },
  { title: 'Warranty', body: 'Every product carries a two-year warranty.' },
];

const TABS = [
  { label: 'Profile', value: 'profile', body: 'Your public name, avatar and bio.' },
  { label: 'Security', value: 'security', body: 'Password and two-factor authentication.' },
  { label: 'Billing', value: 'billing', body: 'Plan, payment method and invoices.' },
];

const ACTIONS = ['Edit', 'Duplicate', 'Delete'];
const FRUITS = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango'];
const MENU_ITEM_ROLES = ['menuitem', 'menuitemcheckbox', 'menuitemradio'];

async function expectExpanded(h, title, expected) {
  const button = h.role('button', title);
  await h.until(async () => {
    const value = await button.getAttribute('aria-expanded');
    return value === String(expected)
      ? null
      : `"${title}" header has aria-expanded=${h.show(value)}, expected "${expected}"`;
  });
}

async function expectBodyExposed(h, body, expected) {
  await h.until(async () => {
    const { exposed } = await h.textState(body);
    return exposed === expected
      ? null
      : `panel text "${body}" is ${exposed ? 'exposed in' : 'hidden from'} the accessibility tree, expected ${expected ? 'exposed' : 'hidden'}`;
  });
}

async function expectBodyRendered(h, body, expected) {
  await h.until(async () => {
    const { visible, exposed } = await h.textState(body);
    if (visible === expected) {
      return null;
    }
    return visible
      ? `panel text "${body}" is rendered on screen${exposed ? '' : ' (while aria-hidden/inert)'}, expected not rendered`
      : `panel text "${body}" is not rendered on screen, expected rendered`;
  });
}

async function expectSection(h, index, expanded) {
  await expectExpanded(h, SECTIONS[index].title, expanded);
  await expectBodyExposed(h, SECTIONS[index].body, expanded);
}

async function toggleWith(h, key) {
  await h.role('button', 'Returns').focus();
  await h.press(key);
  await expectSection(h, 1, true);
  await expectSection(h, 0, false);
  await h.press(key);
  await expectSection(h, 1, false);
}

async function tabUntil(h, key, target, label, maxPresses) {
  const visited = [];
  for (let press = 0; press < maxPresses; press += 1) {
    await h.press(key);
    try {
      await h.focusOn(target, label, 400);
      return;
    } catch {
      visited.push(await h.focusDescription());
    }
  }
  throw new Error(`${key} did not reach ${label}; focus visited: ${visited.join(' → ')}`);
}

async function expectTabSelected(h, label) {
  for (const tab of TABS) {
    const expected = tab.label === label ? 'true' : 'false';
    await h.until(async () => {
      const value = await h.role('tab', tab.label).getAttribute('aria-selected');
      return value === expected
        ? null
        : `tab "${tab.label}" has aria-selected=${h.show(value)}, expected "${expected}"`;
    });
  }
}

async function expectControlledPanel(h, label) {
  const tab = TABS.find((candidate) => candidate.label === label);
  await h.until(async () => {
    const result = await h.role('tab', label).evaluate((element, body) => {
      const refs = window.__a11y.refs(element, 'aria-controls');
      if (refs.length === 0) {
        return 'has no aria-controls';
      }
      const panel = refs.find(
        (ref) => ref && ref.getAttribute('role') === 'tabpanel' && ref.textContent.includes(body),
      );
      if (!panel) {
        return `aria-controls="${element.getAttribute('aria-controls')}" does not reference a role=tabpanel element holding its panel text`;
      }
      return window.__a11y.visible(panel) ? null : 'its controlled tabpanel is not visible';
    }, tab.body);
    return result === null ? null : `tab "${label}" ${result}`;
  });
}

async function expectPanelLabelledBy(h, label) {
  const tab = TABS.find((candidate) => candidate.label === label);
  await h.until(async () => {
    const result = await h.page.evaluate(
      ({ body, name }) => {
        const panels = [...document.querySelectorAll('[role="tabpanel"]')].filter(
          (panel) => window.__a11y.visible(panel) && panel.textContent.includes(body),
        );
        if (panels.length !== 1) {
          return `expected one visible tabpanel holding "${body}", found ${panels.length}`;
        }
        const tabs = window.__a11y.refs(panels[0], 'aria-labelledby');
        const ok = tabs.some(
          (ref) => ref && ref.getAttribute('role') === 'tab' && window.__a11y.name(ref) === name,
        );
        return ok
          ? null
          : `the "${name}" tabpanel has aria-labelledby=${JSON.stringify(panels[0].getAttribute('aria-labelledby'))}, which does not reference the "${name}" tab`;
      },
      { body: tab.body, name: label },
    );
    return result;
  });
}

async function menuOpen(h) {
  return (await h.role('menu').count()) > 0;
}

async function expectMenuOpen(h) {
  await h.until(async () =>
    (await menuOpen(h)) ? null : 'no visible role=menu element after opening',
  );
}

async function expectMenuClosed(h) {
  await h.until(async () => ((await menuOpen(h)) ? 'the menu is still visible' : null));
}

function menuItem(h, name) {
  const menu = h.page.getByRole('menu');
  return MENU_ITEM_ROLES.map((role) => menu.getByRole(role, { name, exact: true })).reduce(
    (left, right) => left.or(right),
  );
}

async function openMenuWith(h, key) {
  await h.role('button', 'Actions').focus();
  await h.press(key);
  await expectMenuOpen(h);
}

async function expectMenuFocus(h, name) {
  await h.focusOn(menuItem(h, name), `menu item "${name}"`);
}

async function listboxTabIn(h) {
  await h.sentinels();
  await h.focusSentinel('before');
  await h.press('Tab');
}

function option(h, name) {
  return h.role('listbox', 'Fruits').getByRole('option', { name, exact: true });
}

async function expectSelection(h, selected) {
  await h.until(async () => {
    const states = await h
      .role('listbox', 'Fruits')
      .getByRole('option')
      .evaluateAll((options) =>
        options.map((element) => ({
          name: window.__a11y.name(element),
          selected: element.getAttribute('aria-selected'),
          checked: element.getAttribute('aria-checked'),
        })),
      );
    if (states.length !== FRUITS.length) {
      return `expected ${FRUITS.length} options, found ${states.length}`;
    }
    const usesChecked = states.some((state) => state.checked !== null);
    const usesSelected = states.some((state) => state.selected !== null);
    if (usesChecked && usesSelected) {
      return 'options mix aria-selected and aria-checked';
    }
    const attribute = usesChecked ? 'aria-checked' : 'aria-selected';
    for (const state of states) {
      const value = usesChecked ? state.checked : state.selected;
      const expected = state.name === selected ? 'true' : 'false';
      if (value !== expected) {
        return `option "${state.name}" has ${attribute}=${value === null ? 'unset' : `"${value}"`}, expected "${expected}"`;
      }
    }
    return null;
  });
}

function combobox(h) {
  return h.role('combobox', 'Fruit');
}

async function popupState(h) {
  return combobox(h).evaluate((input) => {
    const listboxes = [...document.querySelectorAll('[role="listbox"]')].filter((element) =>
      window.__a11y.visible(element),
    );
    const listbox = listboxes[0] ?? null;
    const options = listbox
      ? [...listbox.querySelectorAll('[role="option"]')]
          .filter((element) => window.__a11y.visible(element))
          .map((element) => window.__a11y.name(element))
      : [];
    const active = window.__a11y.refs(input, 'aria-activedescendant')[0] ?? null;
    return {
      open: listbox !== null,
      count: listboxes.length,
      options,
      expanded: input.getAttribute('aria-expanded'),
      domFocus: document.activeElement === input,
      focus: window.__a11y.describe(document.activeElement),
      active: active ? window.__a11y.name(active) : null,
      activeIsOption: active ? active.getAttribute('role') === 'option' : false,
      activeSelected: active ? active.getAttribute('aria-selected') : null,
      value: input.value,
      caret: [input.selectionStart, input.selectionEnd],
    };
  });
}

async function typeInCombobox(h, text) {
  await combobox(h).focus();
  await h.page.keyboard.type(text);
  await h.until(async () => {
    const state = await popupState(h);
    return state.open && state.options.length === 2
      ? null
      : `after typing "${text}" expected a visible listbox with 2 options, got ${state.open ? JSON.stringify(state.options) : 'no visible listbox'}`;
  });
}

async function arrowDownExpected(h) {
  const before = await popupState(h);
  const expected = before.active === 'Banana' ? 'Mango' : 'Banana';
  await h.press('ArrowDown');
  await expectActiveOption(h, expected);
  return expected;
}

async function expectActiveOption(h, name) {
  await h.until(async () => {
    const state = await popupState(h);
    if (!state.domFocus) {
      return `DOM focus left the combobox input (focus is on ${state.focus}); with a listbox popup it must stay on the input and use aria-activedescendant`;
    }
    if (state.active !== name || !state.activeIsOption) {
      return `aria-activedescendant on the input refers to ${state.active === null ? 'nothing' : `"${state.active}"`}, expected the "${name}" option`;
    }
    return null;
  });
}

async function expectPopupClosed(h) {
  await h.until(async () => {
    const state = await popupState(h);
    if (state.open) {
      return 'the listbox popup is still visible';
    }
    if (state.expanded === 'true') {
      return 'the popup is hidden but the input still has aria-expanded="true"';
    }
    return null;
  });
}

function dialog(h) {
  return h.role('dialog', 'Delete file?');
}

async function openDialogWithKeyboard(h) {
  await h.role('button', 'Open dialog').focus();
  await h.press('Enter');
  await h.until(async () =>
    (await dialog(h).count()) === 1 ? null : 'no visible dialog named "Delete file?" after Enter',
  );
}

async function expectDialogClosed(h) {
  await h.until(async () =>
    (await h.page.getByRole('dialog').count()) === 0 ? null : 'a dialog is still visible',
  );
}

async function tabbablesInDialog(h) {
  return dialog(h).evaluate((element) => window.__a11y.tabbables(element).length);
}

async function expectFocusOnTabbable(h, index) {
  await h.until(async () => {
    const result = await dialog(h).evaluate((element, position) => {
      const tabbables = window.__a11y.tabbables(element);
      const target = tabbables.at(position);
      return target === document.activeElement
        ? null
        : `expected focus on ${window.__a11y.describe(target)}, focus is on ${window.__a11y.describe(document.activeElement)}`;
    }, index);
    return result;
  });
}

export const checks = {
  accordion: [
    {
      id: 'accordion.header-structure',
      title: 'Each header is a button wrapped in a heading with a level, and is its only element',
      level: 'required',
      apg: aria('accordion'),
      async run(page, h) {
        for (const { title } of SECTIONS) {
          await h.one('button', title);
          const problem = await h.role('button', title).evaluate((button) => {
            const heading = button.parentElement?.closest('h1,h2,h3,h4,h5,h6,[role="heading"]');
            if (!heading) {
              return 'is not inside an element with role heading';
            }
            const level =
              heading.getAttribute('aria-level') ?? /^H(\d)$/.exec(heading.tagName)?.[1] ?? null;
            if (!level) {
              return 'is inside a role=heading element with no aria-level';
            }
            const others = [...heading.querySelectorAll('*')].filter(
              (element) => element !== button && !button.contains(element),
            );
            return others.length === 0
              ? null
              : `shares its heading with other elements: ${others.map((element) => element.tagName.toLowerCase()).join(', ')}`;
          });
          if (problem) {
            throw new Error(`"${title}" button ${problem}`);
          }
        }
      },
    },
    {
      id: 'accordion.expanded-state',
      title:
        'aria-expanded is "true" on the open header and "false" on the others, matching which panel is exposed',
      level: 'required',
      apg: aria('accordion'),
      async run(page, h) {
        await expectSection(h, 0, true);
        await expectSection(h, 1, false);
        await expectSection(h, 2, false);
      },
    },
    {
      id: 'accordion.panel-rendering',
      title: 'Only the panel whose header has aria-expanded "true" is rendered on screen',
      level: 'required',
      apg: aria('accordion'),
      async run(page, h) {
        await expectBodyRendered(h, SECTIONS[0].body, true);
        await expectBodyRendered(h, SECTIONS[1].body, false);
        await expectBodyRendered(h, SECTIONS[2].body, false);
        await h.role('button', 'Returns').click();
        await expectExpanded(h, 'Returns', true);
        await expectBodyRendered(h, SECTIONS[1].body, true);
        await expectBodyRendered(h, SECTIONS[0].body, false);
      },
    },
    {
      id: 'accordion.aria-controls',
      title: 'An expanded header has aria-controls referencing the element containing its panel',
      level: 'required',
      apg: aria('accordion'),
      async run(page, h) {
        const check = (title, body) =>
          h.until(() =>
            h.role('button', title).evaluate(
              (button, { name, text }) => {
                const refs = window.__a11y.refs(button, 'aria-controls');
                return refs.some((ref) => ref && ref.textContent.includes(text))
                  ? null
                  : `expanded "${name}" header has aria-controls=${JSON.stringify(button.getAttribute('aria-controls'))}, which does not reference an element containing its panel`;
              },
              { name: title, text: body },
            ),
          );
        await check('Shipping', SECTIONS[0].body);
        await h.role('button', 'Returns').click();
        await expectExpanded(h, 'Returns', true);
        await check('Returns', SECTIONS[1].body);
      },
    },
    {
      id: 'accordion.aria-controls-collapsed',
      title:
        'Collapsed headers also have aria-controls, referencing an element that exists in the DOM',
      level: 'optional',
      apg: aria('accordion'),
      async run(page, h) {
        for (const { title } of SECTIONS.slice(1)) {
          const problem = await h.role('button', title).evaluate((button) => {
            const value = button.getAttribute('aria-controls');
            if (!value) {
              return 'has no aria-controls';
            }
            const refs = window.__a11y.refs(button, 'aria-controls');
            return refs.every(Boolean)
              ? null
              : `aria-controls="${value}" references an id that is not in the DOM`;
          });
          if (problem) {
            throw new Error(`collapsed "${title}" header ${problem}`);
          }
        }
      },
    },
    {
      id: 'accordion.enter-toggles',
      title:
        'Enter expands a collapsed header (collapsing the open one) and collapses an expanded one',
      level: 'required',
      apg: kbd('accordion'),
      run: (page, h) => toggleWith(h, 'Enter'),
    },
    {
      id: 'accordion.space-toggles',
      title:
        'Space expands a collapsed header (collapsing the open one) and collapses an expanded one',
      level: 'required',
      apg: kbd('accordion'),
      run: (page, h) => toggleWith(h, 'Space'),
    },
    {
      id: 'accordion.tab-sequence',
      title: 'Every header button is in the page Tab sequence, in order, both directions',
      level: 'required',
      apg: kbd('accordion'),
      async run(page, h) {
        const [shipping, returns, warranty] = SECTIONS.map(({ title }) => h.role('button', title));
        await shipping.focus();
        await tabUntil(h, 'Tab', returns, '"Returns" header', 3);
        await tabUntil(h, 'Tab', warranty, '"Warranty" header', 3);
        await tabUntil(h, 'Shift+Tab', returns, '"Returns" header', 3);
        await tabUntil(h, 'Shift+Tab', shipping, '"Shipping" header', 3);
      },
    },
    {
      id: 'accordion.region',
      title: 'The open panel is a role=region labelled by its header button',
      level: 'optional',
      apg: aria('accordion'),
      async run(page, h) {
        const problem = await h.role('button', 'Shipping').evaluate((button, body) => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let text = null;
          while (walker.nextNode()) {
            if (walker.currentNode.data.trim() === body) {
              text = walker.currentNode.parentElement;
              break;
            }
          }
          const region = text?.closest('[role="region"],section');
          if (!region) {
            return 'the open panel is not inside a role=region element';
          }
          const labels = window.__a11y.refs(region, 'aria-labelledby');
          return labels.includes(button)
            ? null
            : `the region has aria-labelledby=${JSON.stringify(region.getAttribute('aria-labelledby'))}, which does not reference the "Shipping" button`;
        }, SECTIONS[0].body);
        if (problem) {
          throw new Error(problem);
        }
      },
    },
  ],

  tabs: [
    {
      id: 'tabs.roles',
      title: 'A tablist labelled "Account settings" contains the three tabs; a tabpanel is present',
      level: 'required',
      apg: aria('tabs'),
      async run(page, h) {
        const tablist = await h.one('tablist', 'Account settings');
        const names = await tablist
          .getByRole('tab')
          .evaluateAll((tabs) => tabs.map((tab) => window.__a11y.name(tab)));
        if (names.join('|') !== TABS.map((tab) => tab.label).join('|')) {
          throw new Error(`tablist contains tabs ${JSON.stringify(names)}`);
        }
        const orientation = await tablist.getAttribute('aria-orientation');
        if (orientation === 'vertical') {
          throw new Error('horizontal tablist has aria-orientation="vertical"');
        }
        await h.until(async () =>
          (await h.role('tabpanel').count()) >= 1 ? null : 'no visible role=tabpanel element',
        );
      },
    },
    {
      id: 'tabs.aria-selected',
      title: 'The active tab has aria-selected="true", every other tab "false"',
      level: 'required',
      apg: aria('tabs'),
      run: (page, h) => expectTabSelected(h, 'Profile'),
    },
    {
      id: 'tabs.aria-controls',
      title: 'The active tab has aria-controls referencing its visible tabpanel',
      level: 'required',
      apg: aria('tabs'),
      async run(page, h) {
        await expectControlledPanel(h, 'Profile');
        await h.role('tab', 'Security').click();
        await expectControlledPanel(h, 'Security');
      },
    },
    {
      id: 'tabs.aria-controls-inactive',
      title: 'Inactive tabs have aria-controls referencing an element that exists in the DOM',
      level: 'optional',
      apg: aria('tabs'),
      async run(page, h) {
        for (const { label } of TABS.slice(1)) {
          const problem = await h.role('tab', label).evaluate((tab) => {
            const value = tab.getAttribute('aria-controls');
            if (!value) {
              return 'has no aria-controls';
            }
            return window.__a11y.refs(tab, 'aria-controls').every(Boolean)
              ? null
              : `aria-controls="${value}" references an id that is not in the DOM`;
          });
          if (problem) {
            throw new Error(`inactive tab "${label}" ${problem}`);
          }
        }
      },
    },
    {
      id: 'tabs.panel-labelledby',
      title: 'The visible tabpanel has aria-labelledby referencing its tab',
      level: 'required',
      apg: aria('tabs'),
      async run(page, h) {
        await expectPanelLabelledBy(h, 'Profile');
        await h.role('tab', 'Security').click();
        await expectPanelLabelledBy(h, 'Security');
      },
    },
    {
      id: 'tabs.tab-enters-active',
      title: 'Tab into the tablist focuses the active tab',
      level: 'required',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.sentinels();
        await h.role('tab', 'Security').click();
        await expectTabSelected(h, 'Security');
        await h.focusSentinel('before');
        await h.press('Tab');
        await h.focusOn(h.role('tab', 'Security'), 'the active "Security" tab');
      },
    },
    {
      id: 'tabs.tab-leaves-tablist',
      title: 'Tab from the active tab moves focus out of the tablist',
      level: 'required',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.sentinels();
        await h.role('tab', 'Profile').focus();
        await h.press('Tab');
        await h.settle();
        const inside = await h
          .role('tablist', 'Account settings')
          .evaluate((tablist) => tablist.contains(window.__a11y.effective()));
        if (inside) {
          throw new Error(`Tab kept focus inside the tablist, on ${await h.focusDescription()}`);
        }
      },
    },
    {
      id: 'tabs.panel-in-tab-sequence',
      title: 'With no focusable content in the panel, Tab from the tablist lands on the tabpanel',
      level: 'recommended',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.sentinels();
        await h.role('tab', 'Profile').focus();
        await h.press('Tab');
        await h.focusOn(h.role('tabpanel'), 'the visible tabpanel');
      },
    },
    {
      id: 'tabs.arrow-right',
      title: 'Right Arrow moves focus to the next tab',
      level: 'required',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.role('tab', 'Profile').focus();
        await h.press('ArrowRight');
        await h.focusOn(h.role('tab', 'Security'), '"Security" tab');
        await h.press('ArrowRight');
        await h.focusOn(h.role('tab', 'Billing'), '"Billing" tab');
      },
    },
    {
      id: 'tabs.arrow-right-wraps',
      title: 'Right Arrow on the last tab moves focus to the first tab',
      level: 'required',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.role('tab', 'Billing').click();
        await h.focusOn(h.role('tab', 'Billing'), '"Billing" tab');
        await h.press('ArrowRight');
        await h.focusOn(h.role('tab', 'Profile'), '"Profile" tab');
      },
    },
    {
      id: 'tabs.arrow-left',
      title: 'Left Arrow moves focus to the previous tab',
      level: 'required',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.role('tab', 'Billing').click();
        await h.focusOn(h.role('tab', 'Billing'), '"Billing" tab');
        await h.press('ArrowLeft');
        await h.focusOn(h.role('tab', 'Security'), '"Security" tab');
      },
    },
    {
      id: 'tabs.arrow-left-wraps',
      title: 'Left Arrow on the first tab moves focus to the last tab',
      level: 'required',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.role('tab', 'Profile').focus();
        await h.press('ArrowLeft');
        await h.focusOn(h.role('tab', 'Billing'), '"Billing" tab');
      },
    },
    {
      id: 'tabs.automatic-activation',
      title: 'Arrow focus movement activates the focused tab and shows its panel',
      level: 'recommended',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.role('tab', 'Profile').focus();
        await h.press('ArrowRight');
        await h.focusOn(h.role('tab', 'Security'), '"Security" tab');
        await expectTabSelected(h, 'Security');
        await expectBodyExposed(h, TABS[1].body, true);
        await expectBodyExposed(h, TABS[0].body, false);
      },
    },
    {
      id: 'tabs.panel-rendering',
      title: 'Only the active tab panel is rendered on screen',
      level: 'required',
      apg: `${APG}/patterns/tabs/#about`,
      async run(page, h) {
        await expectBodyRendered(h, TABS[0].body, true);
        await expectBodyRendered(h, TABS[1].body, false);
        await expectBodyRendered(h, TABS[2].body, false);
        await h.role('tab', 'Security').click();
        await expectTabSelected(h, 'Security');
        await expectBodyRendered(h, TABS[1].body, true);
        await expectBodyRendered(h, TABS[0].body, false);
      },
    },
    {
      id: 'tabs.home-end',
      title: 'Home focuses the first tab, End the last',
      level: 'optional',
      apg: kbd('tabs'),
      async run(page, h) {
        await h.role('tab', 'Security').click();
        await h.press('End');
        await h.focusOn(h.role('tab', 'Billing'), '"Billing" tab');
        await h.press('Home');
        await h.focusOn(h.role('tab', 'Profile'), '"Profile" tab');
      },
    },
    {
      id: 'tabs.vertical-arrows-ignored',
      title: 'A horizontal tablist does not act on Down or Up Arrow',
      level: 'optional',
      apg: kbd('tabs'),
      async run(page, h) {
        const profile = h.role('tab', 'Profile');
        await profile.focus();
        for (const key of ['ArrowDown', 'ArrowUp']) {
          await h.press(key);
          await h.settle();
          const focused = await profile.evaluate(
            (element) => element === window.__a11y.effective(),
          );
          if (!focused) {
            throw new Error(`${key} moved focus to ${await h.focusDescription()}`);
          }
          await expectTabSelected(h, 'Profile');
        }
      },
    },
  ],

  menu: [
    {
      id: 'menu.button',
      title: 'The trigger has role button and aria-haspopup "menu" or "true"',
      level: 'required',
      apg: aria('menu-button'),
      async run(page, h) {
        const button = await h.one('button', 'Actions');
        const value = await button.getAttribute('aria-haspopup');
        if (value !== 'menu' && value !== 'true') {
          throw new Error(
            `"Actions" has aria-haspopup=${h.show(value)}, expected "menu" or "true"`,
          );
        }
      },
    },
    {
      id: 'menu.expanded-state',
      title:
        'The trigger has aria-expanded "false" while the menu is hidden and "true" while shown',
      level: 'required',
      apg: aria('menu-button'),
      async run(page, h) {
        const button = h.role('button', 'Actions');
        if (await menuOpen(h)) {
          throw new Error('a menu is visible before the trigger was activated');
        }
        const closed = await button.getAttribute('aria-expanded');
        if (closed !== 'false') {
          throw new Error(
            `closed: "Actions" has aria-expanded=${h.show(closed)}, expected "false"`,
          );
        }
        await button.click();
        await expectMenuOpen(h);
        await h.until(async () => {
          const open = await button.getAttribute('aria-expanded');
          return open === 'true'
            ? null
            : `open: "Actions" has aria-expanded=${h.show(open)}, expected "true"`;
        });
      },
    },
    {
      id: 'menu.structure',
      title: 'The popup has role menu and contains the three items with a menuitem role',
      level: 'required',
      apg: aria('menubar'),
      async run(page, h) {
        await h.role('button', 'Actions').click();
        await expectMenuOpen(h);
        await h.until(async () => {
          const items = await h.page
            .getByRole('menu')
            .locator('[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]')
            .evaluateAll((elements) => elements.map((element) => window.__a11y.name(element)));
          return items.join('|') === ACTIONS.join('|')
            ? null
            : `menu items are ${JSON.stringify(items)}, expected ${JSON.stringify(ACTIONS)}`;
        });
      },
    },
    {
      id: 'menu.name',
      title: 'The menu is labelled by the button (aria-labelledby) or has an aria-label',
      level: 'required',
      apg: aria('menubar'),
      async run(page, h) {
        const button = h.role('button', 'Actions');
        await button.click();
        await expectMenuOpen(h);
        const problem = await h.page.getByRole('menu').evaluate((menu) => {
          const labelledBy = window.__a11y.refs(menu, 'aria-labelledby');
          if (labelledBy.some((ref) => ref && window.__a11y.name(ref) === 'Actions')) {
            return null;
          }
          if ((menu.getAttribute('aria-label') ?? '').trim() !== '') {
            return null;
          }
          return `the menu has aria-labelledby=${JSON.stringify(menu.getAttribute('aria-labelledby'))} and aria-label=${JSON.stringify(menu.getAttribute('aria-label'))}`;
        });
        if (problem) {
          throw new Error(problem);
        }
      },
    },
    {
      id: 'menu.item-focus-model',
      title: 'Menu items have tabindex -1, or the menu uses aria-activedescendant',
      level: 'optional',
      apg: aria('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        const problem = await h.page.getByRole('menu').evaluate((menu) => {
          if (window.__a11y.refs(menu, 'aria-activedescendant').some(Boolean)) {
            return null;
          }
          const items = [
            ...menu.querySelectorAll(
              '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]',
            ),
          ];
          const tabbable = items.filter((item) => item.tabIndex >= 0);
          return tabbable.length === 0
            ? null
            : `items with tabindex >= 0: ${tabbable.map((item) => `${window.__a11y.name(item)} (${item.tabIndex})`).join(', ')}`;
        });
        if (problem) {
          throw new Error(problem);
        }
      },
    },
    {
      id: 'menu.enter-opens',
      title: 'Enter on the button opens the menu and focuses the first item',
      level: 'required',
      apg: kbd('menu-button'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
      },
    },
    {
      id: 'menu.space-opens',
      title: 'Space on the button opens the menu and focuses the first item',
      level: 'required',
      apg: kbd('menu-button'),
      async run(page, h) {
        await openMenuWith(h, 'Space');
        await expectMenuFocus(h, 'Edit');
      },
    },
    {
      id: 'menu.arrow-down-opens',
      title: 'Down Arrow on the button opens the menu and focuses the first item',
      level: 'optional',
      apg: kbd('menu-button'),
      async run(page, h) {
        await openMenuWith(h, 'ArrowDown');
        await expectMenuFocus(h, 'Edit');
      },
    },
    {
      id: 'menu.arrow-up-opens',
      title: 'Up Arrow on the button opens the menu and focuses the last item',
      level: 'optional',
      apg: kbd('menu-button'),
      async run(page, h) {
        await openMenuWith(h, 'ArrowUp');
        await expectMenuFocus(h, 'Delete');
      },
    },
    {
      id: 'menu.aria-controls',
      title: 'While open, the button has aria-controls referencing the menu',
      level: 'optional',
      apg: aria('menu-button'),
      async run(page, h) {
        await h.role('button', 'Actions').click();
        await expectMenuOpen(h);
        const problem = await h.role('button', 'Actions').evaluate((button) => {
          const refs = window.__a11y.refs(button, 'aria-controls');
          return refs.some((ref) => ref && ref.getAttribute('role') === 'menu')
            ? null
            : `"Actions" has aria-controls=${JSON.stringify(button.getAttribute('aria-controls'))}, which does not reference the menu`;
        });
        if (problem) {
          throw new Error(problem);
        }
      },
    },
    {
      id: 'menu.arrow-navigation',
      title: 'Down and Up Arrow move focus to the next and previous item',
      level: 'required',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('ArrowDown');
        await expectMenuFocus(h, 'Duplicate');
        await h.press('ArrowDown');
        await expectMenuFocus(h, 'Delete');
        await h.press('ArrowUp');
        await expectMenuFocus(h, 'Duplicate');
      },
    },
    {
      id: 'menu.home-end-or-wrap',
      title: 'Either arrow keys wrap, or Home and End move to the first and last item',
      level: 'required',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('ArrowUp');
        await h.settle();
        const wrapped = await menuItem(h, 'Delete').evaluate(
          (element) => element === window.__a11y.effective(),
        );
        if (wrapped) {
          await h.press('ArrowDown');
          await expectMenuFocus(h, 'Edit');
          return;
        }
        try {
          await h.press('End');
          await expectMenuFocus(h, 'Delete');
          await h.press('Home');
          await expectMenuFocus(h, 'Edit');
        } catch (error) {
          throw new Error(`arrow keys do not wrap and ${error.message}`);
        }
      },
    },
    {
      id: 'menu.arrow-wrap',
      title: 'Arrow keys wrap between the last and first item',
      level: 'optional',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('ArrowUp');
        await expectMenuFocus(h, 'Delete');
        await h.press('ArrowDown');
        await expectMenuFocus(h, 'Edit');
      },
    },
    {
      id: 'menu.home-end',
      title: 'Home and End move focus to the first and last item',
      level: 'optional',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('End');
        await expectMenuFocus(h, 'Delete');
        await h.press('Home');
        await expectMenuFocus(h, 'Edit');
      },
    },
    {
      id: 'menu.typeahead',
      title: 'Typing a character moves focus to the next item starting with it',
      level: 'optional',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('d');
        await expectMenuFocus(h, 'Duplicate');
      },
    },
    {
      id: 'menu.enter-activates',
      title: 'Enter on an item activates it and closes the menu',
      level: 'required',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('ArrowDown');
        await expectMenuFocus(h, 'Duplicate');
        await h.press('Enter');
        await expectMenuClosed(h);
        await h.expectOutput('Duplicate');
      },
    },
    {
      id: 'menu.space-activates',
      title: 'Space on an item activates it and closes the menu',
      level: 'optional',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('ArrowDown');
        await expectMenuFocus(h, 'Duplicate');
        await h.press('Space');
        await expectMenuClosed(h);
        await h.expectOutput('Duplicate');
      },
    },
    {
      id: 'menu.focus-return-after-activation',
      title: 'After keyboard activation of an item, focus returns to the button',
      level: 'optional',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('Enter');
        await expectMenuClosed(h);
        await h.focusOn(h.role('button', 'Actions'), '"Actions" button');
      },
    },
    {
      id: 'menu.escape',
      title: 'Escape closes the menu and returns focus to the button',
      level: 'required',
      apg: kbd('menubar'),
      async run(page, h) {
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('Escape');
        await expectMenuClosed(h);
        await h.focusOn(h.role('button', 'Actions'), '"Actions" button');
      },
    },
    {
      id: 'menu.tab-closes',
      title: 'Tab on an item moves focus out of the menu and closes it',
      level: 'required',
      apg: kbd('menubar'),
      async run(page, h) {
        await h.sentinels();
        await openMenuWith(h, 'Enter');
        await expectMenuFocus(h, 'Edit');
        await h.press('Tab');
        await expectMenuClosed(h);
        const inMenu = await h.page.evaluate(
          () => !!window.__a11y.effective()?.closest('[role="menu"]'),
        );
        if (inMenu) {
          throw new Error(`focus stayed in the menu, on ${await h.focusDescription()}`);
        }
      },
    },
  ],

  listbox: [
    {
      id: 'listbox.roles',
      title: 'A listbox labelled "Fruits" contains the five options and is not multiselectable',
      level: 'required',
      apg: aria('listbox'),
      async run(page, h) {
        const listbox = await h.one('listbox', 'Fruits');
        const names = await listbox
          .getByRole('option')
          .evaluateAll((options) => options.map((element) => window.__a11y.name(element)));
        if (names.join('|') !== FRUITS.join('|')) {
          throw new Error(`listbox options are ${JSON.stringify(names)}`);
        }
        if ((await listbox.getAttribute('aria-multiselectable')) === 'true') {
          throw new Error('single-select listbox has aria-multiselectable="true"');
        }
      },
    },
    {
      id: 'listbox.unselected-state',
      title: 'With nothing selected, every option has aria-selected (or aria-checked) "false"',
      level: 'required',
      apg: aria('listbox'),
      run: (page, h) => expectSelection(h, null),
    },
    {
      id: 'listbox.selected-state',
      title: 'The selected option has aria-selected "true", all others "false", one at a time',
      level: 'required',
      apg: aria('listbox'),
      async run(page, h) {
        await option(h, 'Cherry').click();
        await expectSelection(h, 'Cherry');
        await option(h, 'Mango').click();
        await expectSelection(h, 'Mango');
      },
    },
    {
      id: 'listbox.focus-first',
      title: 'Focusing the listbox with nothing selected focuses the first option',
      level: 'required',
      apg: kbd('listbox'),
      async run(page, h) {
        await listboxTabIn(h);
        await h.focusOn(option(h, 'Apple'), '"Apple" option');
      },
    },
    {
      id: 'listbox.focus-selected',
      title: 'Focusing the listbox with a selected option focuses that option',
      level: 'required',
      apg: kbd('listbox'),
      async run(page, h) {
        await h.sentinels();
        await option(h, 'Cherry').click();
        await expectSelection(h, 'Cherry');
        await h.focusSentinel('before');
        await h.press('Tab');
        await h.focusOn(option(h, 'Cherry'), '"Cherry" option');
      },
    },
    {
      id: 'listbox.arrows',
      title: 'Down and Up Arrow move focus to the next and previous option',
      level: 'required',
      apg: kbd('listbox'),
      async run(page, h) {
        await listboxTabIn(h);
        await h.focusOn(option(h, 'Apple'), '"Apple" option');
        await h.press('ArrowDown');
        await h.focusOn(option(h, 'Banana'), '"Banana" option');
        await h.press('ArrowDown');
        await h.focusOn(option(h, 'Cherry'), '"Cherry" option');
        await h.press('ArrowUp');
        await h.focusOn(option(h, 'Banana'), '"Banana" option');
      },
    },
    {
      id: 'listbox.keyboard-selection',
      title:
        'The focused option can be selected from the keyboard (selection follows focus, Space or Enter)',
      level: 'required',
      apg: kbd('listbox'),
      async run(page, h) {
        await listboxTabIn(h);
        await h.focusOn(option(h, 'Apple'), '"Apple" option');
        await h.press('ArrowDown');
        await h.focusOn(option(h, 'Banana'), '"Banana" option');
        const tried = [];
        for (const key of [null, 'Space', 'Enter']) {
          if (key) {
            await h.press(key);
          }
          try {
            await h.until(async () => {
              const value = await option(h, 'Banana').getAttribute('aria-selected');
              return value === 'true' ? null : 'not selected';
            }, 500);
            await expectSelection(h, 'Banana');
            return;
          } catch {
            tried.push(key ?? 'focus');
          }
        }
        throw new Error(`"Banana" was not selected after ${tried.join(', ')}`);
      },
    },
    {
      id: 'listbox.home-end',
      title: 'Home focuses the first option, End the last',
      level: 'optional',
      apg: kbd('listbox'),
      async run(page, h) {
        await listboxTabIn(h);
        await h.focusOn(option(h, 'Apple'), '"Apple" option');
        await h.press('End');
        await h.focusOn(option(h, 'Mango'), '"Mango" option');
        await h.press('Home');
        await h.focusOn(option(h, 'Apple'), '"Apple" option');
      },
    },
    {
      id: 'listbox.typeahead',
      title: 'Typing one or several characters moves focus to the matching option',
      level: 'recommended',
      apg: kbd('listbox'),
      async run(page, h) {
        await listboxTabIn(h);
        await h.focusOn(option(h, 'Apple'), '"Apple" option');
        await h.press('g');
        await h.focusOn(option(h, 'Grape'), '"Grape" option');
        await h.page.waitForTimeout(1200);
        await h.page.keyboard.type('ch');
        await h.focusOn(option(h, 'Cherry'), '"Cherry" option');
      },
    },
    {
      id: 'listbox.single-tab-stop',
      title: 'The listbox is a single Tab stop: Tab from an option leaves the listbox',
      level: 'recommended',
      apg: COMPOSITE_TAB_STOP,
      async run(page, h) {
        await listboxTabIn(h);
        await h.focusOn(option(h, 'Apple'), '"Apple" option');
        await h.press('Tab');
        await h.settle();
        const inside = await h
          .role('listbox', 'Fruits')
          .evaluate((listbox) => listbox.contains(window.__a11y.effective()));
        if (inside) {
          throw new Error(`Tab kept focus in the listbox, on ${await h.focusDescription()}`);
        }
      },
    },
  ],

  combobox: [
    {
      id: 'combobox.role',
      title: 'The input has role combobox and the name "Fruit"',
      level: 'required',
      apg: aria('combobox'),
      async run(page, h) {
        const element = await h.one('combobox', 'Fruit');
        const tag = await element.evaluate((input) => input.tagName.toLowerCase());
        if (tag !== 'input') {
          throw new Error(`role combobox is on a <${tag}>, not on the input`);
        }
      },
    },
    {
      id: 'combobox.collapsed-state',
      title: 'While the popup is hidden, aria-expanded is "false" (or unset, its default)',
      level: 'required',
      apg: aria('combobox'),
      async run(page, h) {
        const state = await popupState(h);
        if (state.open) {
          throw new Error('a listbox is visible before any interaction');
        }
        if (state.expanded !== null && state.expanded !== 'false') {
          throw new Error(`collapsed combobox has aria-expanded=${h.show(state.expanded)}`);
        }
      },
    },
    {
      id: 'combobox.expanded-state',
      title: 'Typing opens a listbox popup of options and sets aria-expanded "true"',
      level: 'required',
      apg: aria('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        await h.until(async () => {
          const state = await popupState(h);
          return state.expanded === 'true'
            ? null
            : `open combobox has aria-expanded=${h.show(state.expanded)}`;
        });
      },
    },
    {
      id: 'combobox.aria-controls',
      title: 'While open, aria-controls on the combobox references the listbox popup',
      level: 'required',
      apg: aria('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        await h.until(async () =>
          combobox(h).evaluate((input) => {
            const refs = window.__a11y.refs(input, 'aria-controls');
            return refs.some(
              (ref) => ref && ref.getAttribute('role') === 'listbox' && window.__a11y.visible(ref),
            )
              ? null
              : `aria-controls=${JSON.stringify(input.getAttribute('aria-controls'))} does not reference the visible listbox`;
          }),
        );
      },
    },
    {
      id: 'combobox.haspopup',
      title: 'aria-haspopup is unset or "listbox" (the popup is a listbox)',
      level: 'required',
      apg: aria('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        const value = await combobox(h).getAttribute('aria-haspopup');
        if (value !== null && value !== 'listbox') {
          throw new Error(`aria-haspopup=${h.show(value)} does not match a listbox popup`);
        }
      },
    },
    {
      id: 'combobox.autocomplete',
      title:
        'aria-autocomplete is "list" (filtering popup, no inline completion), collapsed and open',
      level: 'required',
      apg: aria('combobox'),
      async run(page, h) {
        const collapsed = await combobox(h).getAttribute('aria-autocomplete');
        await typeInCombobox(h, 'an');
        const open = await combobox(h).getAttribute('aria-autocomplete');
        if (collapsed !== 'list' || open !== 'list') {
          throw new Error(
            `aria-autocomplete is ${h.show(collapsed)} collapsed and ${h.show(open)} open, expected "list" in both`,
          );
        }
      },
    },
    {
      id: 'combobox.tab-sequence',
      title: 'The combobox is in the Tab sequence; the popup and its options are not',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await h.sentinels();
        await h.focusSentinel('before');
        await h.press('Tab');
        await h.focusOn(combobox(h), 'the combobox input');
        await typeInCombobox(h, 'an');
        const tabbable = await h.page.evaluate(() => {
          const listbox = [...document.querySelectorAll('[role="listbox"]')].find((element) =>
            window.__a11y.visible(element),
          );
          return [listbox, ...listbox.querySelectorAll('*')]
            .filter((element) => element.tabIndex >= 0)
            .map((element) => window.__a11y.describe(element));
        });
        if (tabbable.length > 0) {
          throw new Error(`popup elements in the Tab sequence: ${tabbable.join(', ')}`);
        }
      },
    },
    {
      id: 'combobox.arrow-down',
      title:
        'Down Arrow moves to an option via aria-activedescendant while DOM focus stays on the input',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        await arrowDownExpected(h);
      },
    },
    {
      id: 'combobox.arrow-up',
      title: 'Up Arrow in the popup moves to the previous option',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        const first = await arrowDownExpected(h);
        if (first === 'Banana') {
          await h.press('ArrowDown');
          await expectActiveOption(h, 'Mango');
        }
        await h.press('ArrowUp');
        await expectActiveOption(h, 'Banana');
      },
    },
    {
      id: 'combobox.arrow-up-opens-last',
      title: 'Up Arrow from the input moves to the last option',
      level: 'optional',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        await h.press('ArrowUp');
        await expectActiveOption(h, 'Mango');
      },
    },
    {
      id: 'combobox.enter-accepts',
      title: 'Enter accepts the active option: closes the popup and puts its label in the input',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        const picked = await arrowDownExpected(h);
        await h.press('Enter');
        await expectPopupClosed(h);
        await h.until(async () => {
          const state = await popupState(h);
          if (state.value !== picked) {
            return `input value is "${state.value}", expected "${picked}"`;
          }
          return state.domFocus ? null : `focus left the input, it is on ${state.focus}`;
        });
        await h.expectOutput(picked.toLowerCase());
      },
    },
    {
      id: 'combobox.enter-caret-at-end',
      title: 'After Enter accepts an option, the input cursor is at the end of the value',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        const picked = await arrowDownExpected(h);
        await h.press('Enter');
        await h.until(async () => {
          const state = await popupState(h);
          if (state.value !== picked) {
            return `input value is "${state.value}", expected "${picked}"`;
          }
          const end = picked.length;
          return state.caret[0] === end && state.caret[1] === end
            ? null
            : `selection is [${state.caret.join(', ')}], expected the cursor at ${end}`;
        });
      },
    },
    {
      id: 'combobox.escape',
      title: 'Escape closes the popup and keeps focus on the input',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        await arrowDownExpected(h);
        await h.press('Escape');
        await expectPopupClosed(h);
        const state = await popupState(h);
        if (!state.domFocus) {
          throw new Error(`focus left the input, it is on ${state.focus}`);
        }
      },
    },
    {
      id: 'combobox.printable-keeps-popup',
      title: 'Typing while an option is active edits the input and keeps the popup open',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        await arrowDownExpected(h);
        await h.page.keyboard.type('g');
        await h.until(async () => {
          const state = await popupState(h);
          if (state.value !== 'ang') {
            return `input value is "${state.value}", expected "ang"`;
          }
          if (!state.domFocus) {
            return `focus left the input, it is on ${state.focus}`;
          }
          return state.open && state.options.join('|') === 'Mango'
            ? null
            : `expected the popup open with only "Mango", got ${state.open ? JSON.stringify(state.options) : 'no visible popup'}`;
        });
      },
    },
    {
      id: 'combobox.editing-keys',
      title:
        'Left and Right Arrow while an option is active move the input cursor and keep the popup open',
      level: 'required',
      apg: kbd('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        await arrowDownExpected(h);
        for (const [key, position] of [
          ['ArrowLeft', 1],
          ['ArrowRight', 2],
        ]) {
          await h.press(key);
          await h.until(async () => {
            const state = await popupState(h);
            if (!state.domFocus) {
              return `${key}: focus left the input, it is on ${state.focus}`;
            }
            if (state.caret[0] !== position || state.caret[1] !== position) {
              return `${key}: input selection is [${state.caret.join(', ')}], expected the cursor at ${position}`;
            }
            return state.open ? null : `${key} closed the popup`;
          });
        }
      },
    },
    {
      id: 'combobox.selected-follows-active',
      title: 'The option made active with the arrow keys has aria-selected "true"',
      level: 'optional',
      apg: aria('combobox'),
      async run(page, h) {
        await typeInCombobox(h, 'an');
        const picked = await arrowDownExpected(h);
        await h.until(async () => {
          const state = await popupState(h);
          return state.activeSelected === 'true'
            ? null
            : `active option "${picked}" has aria-selected=${h.show(state.activeSelected)}`;
        });
      },
    },
  ],

  dialog: [
    {
      id: 'dialog.role-name',
      title:
        'The dialog has role dialog and is named "Delete file?" by a visible title or aria-label',
      level: 'required',
      apg: aria('dialog-modal'),
      async run(page, h) {
        await h.role('button', 'Open dialog').click();
        await h.one('dialog', 'Delete file?');
        const problem = await dialog(h).evaluate((element) => {
          if (!element.hasAttribute('aria-labelledby')) {
            return null;
          }
          const titles = window.__a11y.refs(element, 'aria-labelledby');
          return titles.length > 0 && titles.every((title) => title && window.__a11y.visible(title))
            ? null
            : 'aria-labelledby does not reference a visible title';
        });
        if (problem) {
          throw new Error(problem);
        }
      },
    },
    {
      id: 'dialog.modal',
      title:
        'The dialog is exposed as modal: aria-modal="true", or the content outside is aria-hidden/inert',
      level: 'required',
      apg: aria('dialog-modal'),
      async run(page, h) {
        await h.role('button', 'Open dialog').click();
        await h.one('dialog', 'Delete file?');
        const problem = await dialog(h).evaluate((element) => {
          if (element.getAttribute('aria-modal') === 'true') {
            return null;
          }
          if (element.tagName === 'DIALOG' && element.matches(':modal')) {
            return null;
          }
          const hidden = (node) => node.closest('[aria-hidden="true"],[inert]') !== null;
          const outside = [
            ...document.querySelectorAll('bench-scenario button, bench-scenario output'),
          ].filter((node) => !element.contains(node));
          if (!hidden(element) && outside.length > 0 && outside.every(hidden)) {
            return null;
          }
          return `aria-modal=${JSON.stringify(element.getAttribute('aria-modal'))} and the content outside the dialog is not aria-hidden or inert`;
        });
        if (problem) {
          throw new Error(problem);
        }
      },
    },
    {
      id: 'dialog.descendants',
      title: 'The controls that operate the dialog are descendants of the role=dialog element',
      level: 'required',
      apg: aria('dialog-modal'),
      async run(page, h) {
        await h.role('button', 'Open dialog').click();
        await h.one('dialog', 'Delete file?');
        for (const name of ['Cancel', 'Delete']) {
          await h.until(async () =>
            (await dialog(h).getByRole('button', { name, exact: true }).count()) === 1
              ? null
              : `"${name}" button is not inside the dialog`,
          );
        }
      },
    },
    {
      id: 'dialog.description',
      title: 'aria-describedby references the description "This action cannot be undone."',
      level: 'optional',
      apg: aria('dialog-modal'),
      async run(page, h) {
        await h.role('button', 'Open dialog').click();
        await h.one('dialog', 'Delete file?');
        const description = await dialog(h).evaluate((element) =>
          window.__a11y
            .refs(element, 'aria-describedby')
            .filter(Boolean)
            .map((ref) => ref.textContent.trim())
            .join(' '),
        );
        if (description !== 'This action cannot be undone.') {
          throw new Error(`accessible description is ${JSON.stringify(description)}`);
        }
      },
    },
    {
      id: 'dialog.initial-focus',
      title: 'Opening the dialog moves focus inside it',
      level: 'required',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        await h.until(async () => {
          const inside = await dialog(h).evaluate((element) =>
            element.contains(document.activeElement),
          );
          return inside ? null : `focus is on ${await h.focusDescription()}, outside the dialog`;
        });
      },
    },
    {
      id: 'dialog.tab-wraps',
      title: 'Tab on the last tabbable element moves focus to the first one inside the dialog',
      level: 'required',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        if ((await tabbablesInDialog(h)) < 2) {
          throw new Error('the dialog has fewer than two tabbable elements');
        }
        await dialog(h).evaluate((element) => window.__a11y.tabbables(element).at(-1).focus());
        await expectFocusOnTabbable(h, -1);
        await h.press('Tab');
        await expectFocusOnTabbable(h, 0);
      },
    },
    {
      id: 'dialog.shift-tab-wraps',
      title:
        'Shift+Tab on the first tabbable element moves focus to the last one inside the dialog',
      level: 'required',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        if ((await tabbablesInDialog(h)) < 2) {
          throw new Error('the dialog has fewer than two tabbable elements');
        }
        await dialog(h).evaluate((element) => window.__a11y.tabbables(element)[0].focus());
        await expectFocusOnTabbable(h, 0);
        await h.press('Shift+Tab');
        await expectFocusOnTabbable(h, -1);
      },
    },
    {
      id: 'dialog.escape',
      title: 'Escape closes the dialog',
      level: 'required',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        await h.press('Escape');
        await expectDialogClosed(h);
      },
    },
    {
      id: 'dialog.focus-return-escape',
      title: 'Closing with Escape returns focus to the "Open dialog" button',
      level: 'required',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        await h.press('Escape');
        await expectDialogClosed(h);
        await h.focusOn(h.role('button', 'Open dialog'), '"Open dialog" button');
      },
    },
    {
      id: 'dialog.focus-return-cancel',
      title: 'Closing with the Cancel button returns focus to the "Open dialog" button',
      level: 'required',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        await dialog(h).getByRole('button', { name: 'Cancel', exact: true }).focus();
        await h.press('Enter');
        await expectDialogClosed(h);
        await h.focusOn(h.role('button', 'Open dialog'), '"Open dialog" button');
      },
    },
    {
      id: 'dialog.focus-return-delete',
      title: 'Closing with the Delete button returns focus to the "Open dialog" button',
      level: 'optional',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        await dialog(h).getByRole('button', { name: 'Delete', exact: true }).focus();
        await h.press('Enter');
        await expectDialogClosed(h);
        await h.expectOutput('deleted');
        await h.focusOn(h.role('button', 'Open dialog'), '"Open dialog" button');
      },
    },
    {
      id: 'dialog.close-button',
      title: 'The Tab sequence of the dialog includes a visible button that closes it',
      level: 'recommended',
      apg: kbd('dialog-modal'),
      async run(page, h) {
        await openDialogWithKeyboard(h);
        const cancel = dialog(h).getByRole('button', { name: 'Cancel', exact: true });
        const tabbable = await cancel.evaluate(
          (element) =>
            window.__a11y.visible(element) &&
            window.__a11y.tabbables(element.closest('[role="dialog"]')).includes(element),
        );
        if (!tabbable) {
          throw new Error('the "Cancel" button is not a visible element of the Tab sequence');
        }
        await cancel.focus();
        await h.press('Enter');
        await expectDialogClosed(h);
      },
    },
  ],
};

export const openStates = {
  menu: async (page, h) => {
    await h.role('button', 'Actions').click();
    await expectMenuOpen(h);
  },
  combobox: async (page, h) => {
    await typeInCombobox(h, 'an');
  },
  dialog: async (page, h) => {
    await h.role('button', 'Open dialog').click();
    await h.one('dialog', 'Delete file?');
  },
};

const NG_PRIMITIVES_COLLAPSE =
  'ng-primitives sets `hidden="until-found"` on a closed panel only once its measured height is 0, which needs consumer CSS that collapses it; with none (SCENARIOS rule 4) a panel the user closes stays rendered and exposed with `data-exit` set. Initially closed panels are hidden. The CSS is not recorded in NOTES.md.';
const MENU_NAME =
  'the library puts no `aria-labelledby`/`aria-label` on the menu, and the scenario does not add one by hand.';
const ROVING_MENU =
  'roving tabindex: the active item has `tabindex="0"`, as in the roving-tabindex practice the menu pattern links to; the menu text asks for `-1` on every item.';

export const notes = {
  'accordion/forty/accordion.aria-controls-collapsed': {
    cause: 'scenario',
    text: 'the scenario unmounts closed panels with `@if`, one of the two ways the forty README documents (the other needs CSS); the README states that the trigger then emits `aria-controls` only while expanded.',
  },
  'tabs/forty/tabs.aria-controls-inactive': {
    cause: 'scenario',
    text: 'the scenario unmounts inactive panels with `@if` (the forty README offers that or CSS); `aria-controls` is emitted only for a registered panel, so an unmounted one has none.',
  },
  'accordion/angular-cdk/accordion.aria-controls-collapsed': {
    cause: 'scenario',
    text: 'the ARIA is hand-written (the CDK provides only state), copied from the CDK docs example, which unmounts the panel with `@if` while keeping the id in `aria-controls`.',
  },
  'accordion/ng-primitives/accordion.panel-rendering': {
    cause: 'library',
    text: NG_PRIMITIVES_COLLAPSE,
  },
  'accordion/ng-primitives/accordion.enter-toggles': {
    cause: 'library',
    text: NG_PRIMITIVES_COLLAPSE,
  },
  'accordion/ng-primitives/accordion.space-toggles': {
    cause: 'library',
    text: NG_PRIMITIVES_COLLAPSE,
  },
  'menu/ng-primitives/menu.tab-closes': {
    cause: 'library',
    text: 'the menu always installs a focus trap (by design, per a comment in its source), so Tab cycles inside the open menu instead of leaving and closing it.',
  },
  'menu/ng-primitives/menu.arrow-down-opens': {
    cause: 'library',
    text: 'arrow keys open the menu only when `arrowkey` is added to the trigger triggers; the default is `click` only.',
  },
  'menu/ng-primitives/menu.arrow-up-opens': {
    cause: 'library',
    text: 'arrow keys open the menu only when `arrowkey` is added to the trigger triggers (and Up Arrow only for a top placement); the default is `click` only.',
  },
  'menu/ng-primitives/menu.aria-controls': {
    cause: 'library',
    text: 'the trigger never gets `aria-controls`.',
  },
  'menu/ng-primitives/menu.typeahead': {
    cause: 'library',
    text: 'the menu has no typeahead.',
  },
  'menu/ng-primitives/menu.name': { cause: 'library', text: MENU_NAME },
  'menu/angular-aria/menu.name': { cause: 'library', text: MENU_NAME },
  'menu/angular-cdk/menu.name': { cause: 'library', text: MENU_NAME },
  'menu/ng-primitives/menu.item-focus-model': { cause: 'library', text: ROVING_MENU },
  'menu/angular-aria/menu.item-focus-model': { cause: 'library', text: ROVING_MENU },
  'menu/angular-cdk/menu.item-focus-model': { cause: 'library', text: ROVING_MENU },
  'combobox/angular-aria/combobox.autocomplete': {
    cause: 'library',
    text: '`aria-autocomplete` is derived from a registered popup; the popup directive lives inside the overlay template (as in the guide), so it reads "none" until the popup first opens.',
  },
  'combobox/ng-primitives/combobox.selected-follows-active': {
    cause: 'library',
    text: 'combobox options never carry `aria-selected` (the same gap NOTES.md records for its listbox).',
  },
  'combobox/angular-aria/combobox.selected-follows-active': {
    cause: 'scenario',
    text: 'the scenario uses `selectionMode="explicit"` (the guide manual example; the default `follow` would select Apple on open), so the active option is not selected.',
  },
  'combobox/spartan/combobox.selected-follows-active': {
    cause: 'library',
    text: 'the highlighted item keeps `aria-selected="false"`.',
  },
  'menu/ng-primitives/axe:target-size': {
    cause: 'scenario',
    text: 'layout, not semantics: without the `[ngpMenu] { position: fixed }` rule NOTES.md lists, the menu renders in flow flush under the trigger, so the 21 px default buttons have no spacing.',
  },
};
