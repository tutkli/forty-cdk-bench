import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="openDialog()">Open dialog</button>
    <ng-template #dialogTemplate let-dialogRef="dialogRef">
      <h2 id="bench-dialog-title">Delete file?</h2>
      <p id="bench-dialog-description">This action cannot be undone.</p>
      <button type="button" (click)="dialogRef.close()">Cancel</button>
      <button type="button" (click)="dialogRef.close('deleted')">Delete</button>
    </ng-template>
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  private readonly dialog = inject(Dialog);
  private readonly dialogTemplate = viewChild.required<TemplateRef<unknown>>('dialogTemplate');

  protected readonly value = signal('');

  protected openDialog(): void {
    const dialogRef = this.dialog.open<string>(this.dialogTemplate(), {
      ariaModal: true,
      ariaLabelledBy: 'bench-dialog-title',
      ariaDescribedBy: 'bench-dialog-description',
    });
    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.value.set(result);
      }
    });
  }
}
