import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgpMenu, NgpMenuItem, NgpMenuTrigger } from 'ng-primitives/menu';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgpMenu, NgpMenuItem, NgpMenuTrigger],
  template: `
    <button #trigger type="button" [ngpMenuTrigger]="menu">Actions</button>

    <ng-template #menu>
      <div ngpMenu>
        @for (action of actions; track action) {
          <button type="button" ngpMenuItem (click)="activate(action, trigger)">
            {{ action }}
          </button>
        }
      </div>
    </ng-template>

    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly actions = ['Edit', 'Duplicate', 'Delete'];

  protected readonly value = signal('');

  protected activate(action: string, trigger: HTMLButtonElement): void {
    this.value.set(action);
    trigger.focus();
  }
}
