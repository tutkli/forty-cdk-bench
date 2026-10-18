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
        <button type="button" forListboxOption [value]="fruit.value">{{ fruit.label }}</button>
      }
    </div>
    <output>{{ value()[0] ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly fruits = FRUITS;

  protected readonly value = signal<readonly string[]>([]);
}
