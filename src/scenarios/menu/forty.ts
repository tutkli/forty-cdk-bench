import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forDropdownMenu #menu="forDropdownMenu" side="bottom" align="start">
      <button type="button" forDropdownMenuTrigger>Actions</button>
      @if (menu.open()) {
        <div forMenuContent>
          @for (action of actions; track action) {
            <button type="button" forMenuItem (activate)="value.set(action)">{{ action }}</button>
          }
        </div>
      }
    </div>
    <output>{{ value() }}</output>
  `,
})
export class Scenario {
  protected readonly actions = ['Edit', 'Duplicate', 'Delete'];

  protected readonly value = signal('');
}
