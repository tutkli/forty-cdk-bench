import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Menu, MenuContent, MenuItem, MenuTrigger, OverlayModule],
  template: `
    <button type="button" ngMenuTrigger #origin #trigger="ngMenuTrigger" [menu]="actionsMenu()">
      Actions
    </button>
    <ng-template
      [cdkConnectedOverlayOpen]="trigger.expanded()"
      [cdkConnectedOverlay]="{ origin, usePopover: 'inline' }"
      [cdkConnectedOverlayPositions]="[
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
      ]"
    >
      <div ngMenu #actionsMenu="ngMenu" (itemSelected)="value.set($event ?? '')">
        <ng-template ngMenuContent>
          @for (action of actions; track action) {
            <div ngMenuItem [value]="action">{{ action }}</div>
          }
        </ng-template>
      </div>
    </ng-template>
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly actions = ['Edit', 'Duplicate', 'Delete'];

  protected readonly actionsMenu = viewChild<Menu<string>>('actionsMenu');

  protected readonly value = signal('');
}
