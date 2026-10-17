import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  BrnCombobox,
  BrnComboboxAnchor,
  BrnComboboxContent,
  BrnComboboxInput,
  BrnComboboxItem,
  BrnComboboxList,
  BrnComboboxPopoverTrigger,
} from '@spartan-ng/brain/combobox';
import {
  BrnPopover,
  BrnPopoverContent,
  provideBrnPopoverConfig,
  provideBrnPopoverDefaultOptions,
} from '@spartan-ng/brain/popover';

interface Fruit {
  value: string;
  label: string;
}

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BrnCombobox,
    BrnPopover,
    BrnComboboxAnchor,
    BrnComboboxInput,
    BrnComboboxPopoverTrigger,
    BrnPopoverContent,
    BrnComboboxContent,
    BrnComboboxList,
    BrnComboboxItem,
  ],
  providers: [
    provideBrnPopoverConfig({ align: 'start' }),
    provideBrnPopoverDefaultOptions({ role: null }),
  ],
  template: `
    <div brnCombobox brnPopover [(value)]="value" [(search)]="search">
      <input
        brnComboboxInput
        brnComboboxAnchor
        brnComboboxPopoverTrigger
        [closeOnTriggerClick]="false"
        aria-label="Fruit"
      />
      <div *brnPopoverContent brnComboboxContent>
        <div brnComboboxList>
          @for (fruit of filtered(); track fruit.value) {
            <div brnComboboxItem [value]="fruit">{{ fruit.label }}</div>
          }
        </div>
      </div>
    </div>
    <output>{{ value()?.value ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly fruits: Fruit[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'grape', label: 'Grape' },
    { value: 'mango', label: 'Mango' },
  ];

  protected readonly value = signal<Fruit | null | undefined>(null);
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const search = this.search().toLowerCase();
    return this.fruits.filter((fruit) => fruit.label.toLowerCase().includes(search));
  });
}
