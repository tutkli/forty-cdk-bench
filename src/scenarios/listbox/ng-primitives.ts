import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgpListbox, NgpListboxOption } from 'ng-primitives/listbox';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgpListbox, NgpListboxOption],
  template: `
    <div ngpListbox [(ngpListboxValue)]="value" aria-label="Fruits">
      @for (fruit of fruits; track fruit.value) {
        <div
          ngpListboxOption
          #option="ngpListboxOption"
          [ngpListboxOptionValue]="fruit.value"
          [attr.aria-selected]="option.selected()"
        >
          {{ fruit.label }}
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

  protected readonly value = signal<string[]>([]);
}
