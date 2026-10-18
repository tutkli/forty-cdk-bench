import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgpListbox, NgpListboxOption } from 'ng-primitives/listbox';
import { FRUITS } from '../data';

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
  protected readonly fruits = FRUITS;

  protected readonly value = signal<string[]>([]);
}
