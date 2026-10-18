import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CdkListbox, CdkOption } from '@angular/cdk/listbox';
import { FRUITS } from '../data';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkListbox, CdkOption],
  template: `
    <ul
      cdkListbox
      aria-label="Fruits"
      [cdkListboxValue]="value()"
      (cdkListboxValueChange)="value.set($event.value)"
    >
      @for (fruit of fruits; track fruit.value) {
        <li [cdkOption]="fruit.value">{{ fruit.label }}</li>
      }
    </ul>
    <output>{{ value()[0] ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly fruits = FRUITS;

  protected readonly value = signal<readonly string[]>([]);
}
