import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  BrnDialog,
  BrnDialogClose,
  BrnDialogContent,
  BrnDialogDescription,
  BrnDialogOverlay,
  BrnDialogTitle,
  BrnDialogTrigger,
} from '@spartan-ng/brain/dialog';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BrnDialog,
    BrnDialogOverlay,
    BrnDialogTrigger,
    BrnDialogContent,
    BrnDialogTitle,
    BrnDialogDescription,
    BrnDialogClose,
  ],
  template: `
    <brn-dialog>
      <brn-dialog-overlay />
      <button brnDialogTrigger>Open dialog</button>
      <div *brnDialogContent="let ctx">
        <h2 brnDialogTitle>Delete file?</h2>
        <p brnDialogDescription>This action cannot be undone.</p>
        <button brnDialogClose>Cancel</button>
        <button type="button" (click)="value.set('deleted'); ctx.close()">Delete</button>
      </div>
    </brn-dialog>
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly value = signal('');
}
