import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';

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
  protected readonly fruits = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'grape', label: 'Grape' },
    { value: 'mango', label: 'Mango' },
  ];

  protected readonly value = signal<readonly string[]>([]);
}
