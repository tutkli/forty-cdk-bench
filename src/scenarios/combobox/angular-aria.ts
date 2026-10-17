import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, OverlayModule],
  template: `
    <div #origin>
      <input
        ngCombobox
        #combobox="ngCombobox"
        aria-label="Fruit"
        [(value)]="query"
        [(expanded)]="expanded"
        (click)="expanded.set(true)"
      />
    </div>
    <ng-template
      [cdkConnectedOverlay]="{ origin, usePopover: 'inline', matchWidth: true }"
      [cdkConnectedOverlayOpen]="expanded()"
    >
      <ng-template ngComboboxPopup [combobox]="combobox">
        <div
          ngListbox
          ngComboboxWidget
          #listbox="ngListbox"
          aria-label="Fruits"
          focusMode="activedescendant"
          selectionMode="explicit"
          [tabindex]="-1"
          [activeDescendant]="listbox.activeDescendant()"
          [(value)]="selected"
          (click)="commit()"
          (keydown.enter)="commit()"
        >
          @for (fruit of filtered(); track fruit.value) {
            <div ngOption [value]="fruit.value" [label]="fruit.label">{{ fruit.label }}</div>
          }
        </div>
      </ng-template>
    </ng-template>
    <output>{{ selected()[0] ?? '' }}</output>
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

  private readonly combobox = viewChild.required(Combobox);

  protected readonly query = signal('');
  protected readonly expanded = signal(false);
  protected readonly selected = signal<string[]>([]);

  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.fruits.filter((fruit) => fruit.label.toLowerCase().includes(query));
  });

  protected commit(): void {
    const fruit = this.fruits.find((candidate) => candidate.value === this.selected()[0]);
    if (fruit) {
      this.query.set(fruit.label);
    }
    this.expanded.set(false);
    this.combobox().element.focus();
  }
}
