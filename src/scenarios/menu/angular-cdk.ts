import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkMenuTrigger, CdkMenu, CdkMenuItem],
  template: `
    <button type="button" [cdkMenuTriggerFor]="menu">Actions</button>
    <ng-template #menu>
      <div cdkMenu>
        @for (action of actions; track action) {
          <button type="button" cdkMenuItem (cdkMenuItemTriggered)="value.set(action)">
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
}
