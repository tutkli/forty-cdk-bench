import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BrnTabs, BrnTabsContent, BrnTabsList, BrnTabsTrigger } from '@spartan-ng/brain/tabs';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrnTabs, BrnTabsList, BrnTabsTrigger, BrnTabsContent],
  template: `
    <div [(brnTabs)]="value" activationMode="automatic">
      <div brnTabsList aria-label="Account settings">
        @for (tab of tabs; track tab.value) {
          <button [brnTabsTrigger]="tab.value">{{ tab.label }}</button>
        }
      </div>
      @for (tab of tabs; track tab.value) {
        <div [brnTabsContent]="tab.value">
          <p>{{ tab.body }}</p>
        </div>
      }
    </div>
    <output>{{ value() ?? '' }}</output>
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
