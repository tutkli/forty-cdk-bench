import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogClose,
  ForDialogDescription,
  ForDialogTitle,
  ForDialogTrigger,
} from 'forty-cdk/dialog';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDialog, ForDialogTrigger, ForDialogTitle, ForDialogDescription, ForDialogClose],
  template: `
    <button type="button" forDialogTrigger [(open)]="open" controls="bench-dialog">
      Open dialog
    </button>
    @if (open()) {
      <div forDialog id="bench-dialog" (dismiss)="open.set(false)">
        <h2 forDialogTitle>Delete file?</h2>
        <p forDialogDescription>This action cannot be undone.</p>
        <button type="button" forDialogClose>Cancel</button>
        <button type="button" (click)="remove()">Delete</button>
      </div>
    }
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly open = signal(false);
  protected readonly value = signal('');

  protected remove(): void {
    this.value.set('deleted');
    this.open.set(false);
  }
}
