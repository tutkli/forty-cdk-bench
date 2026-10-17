import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  NgpAccordion,
  NgpAccordionContent,
  NgpAccordionItem,
  NgpAccordionTrigger,
} from 'ng-primitives/accordion';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgpAccordion, NgpAccordionItem, NgpAccordionTrigger, NgpAccordionContent],
  template: `
    <div
      ngpAccordion
      ngpAccordionType="single"
      ngpAccordionCollapsible
      [(ngpAccordionValue)]="value"
    >
      @for (section of sections; track section.value) {
        <div ngpAccordionItem [ngpAccordionItemValue]="section.value">
          <h3>
            <button type="button" ngpAccordionTrigger>{{ section.title }}</button>
          </h3>
          <div ngpAccordionContent>
            <p>{{ section.body }}</p>
          </div>
        </div>
      }
    </div>
    <output>{{ value() ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly sections = [
    { value: 'shipping', title: 'Shipping', body: 'Orders ship within two business days.' },
    { value: 'returns', title: 'Returns', body: 'Returns are accepted within 30 days.' },
    { value: 'warranty', title: 'Warranty', body: 'Every product carries a two-year warranty.' },
  ];

  protected readonly value = signal<string | null>('shipping');
}
