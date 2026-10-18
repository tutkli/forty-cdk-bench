import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Listbox, Option } from '@angular/aria/listbox';
import { FRUITS } from '../data';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Listbox, Option],
  template: `
    <div ngListbox aria-label="Fruits" selectionMode="explicit" [(value)]="value">
      @for (fruit of fruits; track fruit.value) {
        <div ngOption [value]="fruit.value" [label]="fruit.label">{{ fruit.label }}</div>
      }
    </div>
    <output>{{ value()[0] ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly fruits = FRUITS;

  protected readonly value = signal<string[]>([]);
}
