import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  AccordionContent,
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
} from '@angular/aria/accordion';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionGroup, AccordionTrigger, AccordionPanel, AccordionContent],
  template: `
    <div ngAccordionGroup [multiExpandable]="false">
      @for (section of sections; track section.value) {
        <h3>
          <button
            type="button"
            ngAccordionTrigger
            [panel]="panel"
            [expanded]="value() === section.value"
            (expandedChange)="onExpandedChange(section.value, $event)"
          >
            {{ section.title }}
          </button>
        </h3>
        <div ngAccordionPanel #panel="ngAccordionPanel">
          <ng-template ngAccordionContent>
            <p>{{ section.body }}</p>
          </ng-template>
        </div>
      }
    </div>
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
