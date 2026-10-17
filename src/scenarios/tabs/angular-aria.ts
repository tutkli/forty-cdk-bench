import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Tabs, TabList, Tab, TabPanel, TabContent],
  template: `
    <div ngTabs>
      <div ngTabList selectionMode="follow" aria-label="Account settings" [(selectedTab)]="value">
        @for (tab of tabs; track tab.value) {
          <button type="button" ngTab [value]="tab.value">{{ tab.label }}</button>
        }
      </div>
      @for (tab of tabs; track tab.value) {
        <div ngTabPanel #panel="ngTabPanel" [value]="tab.value" [hidden]="!panel.visible()">
          <ng-template ngTabContent>
            <p>{{ tab.body }}</p>
          </ng-template>
        </div>
      }
    </div>
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly tabs = [
    { value: 'profile', label: 'Profile', body: 'Your public name, avatar and bio.' },
    { value: 'security', label: 'Security', body: 'Password and two-factor authentication.' },
    { value: 'billing', label: 'Billing', body: 'Plan, payment method and invoices.' },
  ];

  protected readonly value = signal<string | undefined>('profile');
}
