import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CdkAccordion, CdkAccordionItem } from '@angular/cdk/accordion';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkAccordion, CdkAccordionItem],
  template: `
    <cdk-accordion>
      @for (section of sections; track section.value) {
        <cdk-accordion-item
          #item="cdkAccordionItem"
          [expanded]="value() === section.value"
          (expandedChange)="onExpandedChange(section.value, $event)"
        >
          <h3>
            <button
              type="button"
              [id]="item.id + '-header'"
              [attr.aria-expanded]="item.expanded"
              [attr.aria-controls]="item.id + '-body'"
              (click)="item.toggle()"
            >
              {{ section.title }}
            </button>
          </h3>
          @if (item.expanded) {
            <div
              role="region"
              [id]="item.id + '-body'"
              [attr.aria-labelledby]="item.id + '-header'"
            >
              <p>{{ section.body }}</p>
            </div>
          }
        </cdk-accordion-item>
      }
    </cdk-accordion>
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly sections = [
    { value: 'shipping', title: 'Shipping', body: 'Orders ship within two business days.' },
    { value: 'returns', title: 'Returns', body: 'Returns are accepted within 30 days.' },
    { value: 'warranty', title: 'Warranty', body: 'Every product carries a two-year warranty.' },
  ];

  protected readonly value = signal('shipping');

  protected onExpandedChange(value: string, expanded: boolean): void {
    if (expanded) {
      this.value.set(value);
    } else if (this.value() === value) {
      this.value.set('');
    }
  }
}
