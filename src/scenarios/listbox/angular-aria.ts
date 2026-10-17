import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Listbox, Option } from '@angular/aria/listbox';

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
  protected readonly fruits = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'grape', label: 'Grape' },
    { value: 'mango', label: 'Mango' },
  ];

  protected readonly value = signal<string[]>([]);
}
