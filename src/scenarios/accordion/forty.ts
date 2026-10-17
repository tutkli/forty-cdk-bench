import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion [(value)]="value" collapsible>
      @for (section of sections; track section.value) {
        <div forAccordionItem [value]="section.value">
          <h3>
            <button type="button" forAccordionTrigger>{{ section.title }}</button>
          </h3>
          <div forAccordionContent>
            <p>{{ section.body }}</p>
          </div>
        </div>
      }
    </div>
    <output>{{ value()[0] ?? '' }}</output>
  `,
})
export class Scenario {
  protected readonly sections = [
    { value: 'shipping', title: 'Shipping', body: 'Orders ship within two business days.' },
    { value: 'returns', title: 'Returns', body: 'Returns are accepted within 30 days.' },
    { value: 'warranty', title: 'Warranty', body: 'Every product carries a two-year warranty.' },
  ];

  protected readonly value = signal<readonly string[]>(['shipping']);
}
