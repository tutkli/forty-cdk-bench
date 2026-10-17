import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CdkListbox, CdkOption } from '@angular/cdk/listbox';

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
  protected readonly fruits = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'grape', label: 'Grape' },
    { value: 'mango', label: 'Mango' },
  ];

  protected readonly value = signal<readonly string[]>([]);
}
