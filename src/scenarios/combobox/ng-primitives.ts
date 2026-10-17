import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  NgpCombobox,
  NgpComboboxDropdown,
  NgpComboboxInput,
  NgpComboboxOption,
  NgpComboboxPortal,
} from 'ng-primitives/combobox';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgpCombobox,
    NgpComboboxInput,
    NgpComboboxPortal,
    NgpComboboxDropdown,
    NgpComboboxOption,
  ],
  template: `
    <div
      ngpCombobox
      [(ngpComboboxValue)]="value"
      (ngpComboboxValueChange)="onValueChange($event)"
      (ngpComboboxOpenChange)="onOpenChange($event)"
    >
      <input ngpComboboxInput aria-label="Fruit" [value]="inputValue()" (input)="onInput($event)" />

      <div *ngpComboboxPortal ngpComboboxDropdown>
        @for (fruit of filtered(); track fruit.value) {
          <div ngpComboboxOption [ngpComboboxOptionValue]="fruit.value">{{ fruit.label }}</div>
        }
      </div>
    </div>
    <output>{{ value() ?? '' }}</output>
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

  protected readonly value = signal<string | undefined>(undefined);
  protected readonly inputValue = signal('');
  protected readonly filter = signal('');

  protected readonly filtered = computed(() => {
    const filter = this.filter().toLowerCase();
    return this.fruits.filter((fruit) => fruit.label.toLowerCase().includes(filter));
  });

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.inputValue.set(input.value);
    this.filter.set(input.value);
  }

  protected onValueChange(value: string | undefined): void {
    this.inputValue.set(this.labelOf(value));
    this.filter.set('');
  }

  protected onOpenChange(open: boolean): void {
    if (open) {
      return;
    }
    if (this.inputValue() === '') {
      this.value.set(undefined);
    } else {
      this.inputValue.set(this.labelOf(this.value()));
    }
    this.filter.set('');
  }

  private labelOf(value: string | undefined): string {
    return this.fruits.find((fruit) => fruit.value === value)?.label ?? '';
  }
}
