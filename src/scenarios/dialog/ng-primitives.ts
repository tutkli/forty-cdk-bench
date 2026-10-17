import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  NgpDialog,
  NgpDialogDescription,
  NgpDialogOverlay,
  NgpDialogTitle,
  NgpDialogTrigger,
} from 'ng-primitives/dialog';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgpDialog, NgpDialogOverlay, NgpDialogTitle, NgpDialogDescription, NgpDialogTrigger],
  template: `
    <button type="button" [ngpDialogTrigger]="dialog">Open dialog</button>

    <ng-template #dialog let-close="close">
      <div ngpDialogOverlay>
        <div ngpDialog>
          <h2 ngpDialogTitle>Delete file?</h2>
          <p ngpDialogDescription>This action cannot be undone.</p>
          <button type="button" (click)="close()">Cancel</button>
          <button type="button" (click)="value.set('deleted'); close()">Delete</button>
        </div>
      </div>
    </ng-template>

    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly value = signal('');
}
