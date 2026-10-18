import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { FRUITS } from '../data';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption],
  template: `
    <div forListbox [(value)]="value" aria-label="Fruits">
      @for (fruit of fruits; track fruit.value) {
        <div forListboxOption [value]="fruit.value">{{ fruit.label }}</div>
      }
    </div>
    <output>{{ value()[0] ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly fruits = FRUITS;

  protected readonly value = signal<readonly string[]>([]);
}
