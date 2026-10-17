import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  BrnAccordion,
  BrnAccordionContent,
  BrnAccordionHeader,
  BrnAccordionItem,
  BrnAccordionTrigger,
} from '@spartan-ng/brain/accordion';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BrnAccordion,
    BrnAccordionItem,
    BrnAccordionHeader,
    BrnAccordionTrigger,
    BrnAccordionContent,
  ],
  template: `
    <div brnAccordion type="single">
      @for (section of sections; track section.value) {
        <div
          brnAccordionItem
          #item="brnAccordionItem"
          [isOpened]="value() === section.value"
          (openedChange)="onOpenedChange(section.value, $event)"
        >
          <h3 brnAccordionHeader>
            <button brnAccordionTrigger>{{ section.title }}</button>
          </h3>
          <div brnAccordionContent [hidden]="item.state() === 'closed'">
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

  protected onOpenedChange(section: string, opened: boolean): void {
    if (opened) {
      this.value.set(section);
    } else if (this.value() === section) {
      this.value.set(null);
    }
  }
}
