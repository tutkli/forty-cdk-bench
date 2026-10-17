import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div forCombobox #combobox="forCombobox" [(query)]="query" [(value)]="value" ariaLabel="Fruit">
      <input forComboboxInput aria-label="Fruit" />
      @if (combobox.open()) {
        <div forComboboxContent>
          @for (fruit of filtered(); track fruit.value) {
            <div forComboboxOption [value]="fruit.value" [label]="fruit.label">
              {{ fruit.label }}
            </div>
          }
        </div>
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

  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>([]);

  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.fruits.filter((fruit) => fruit.label.toLowerCase().includes(query));
  });
}
