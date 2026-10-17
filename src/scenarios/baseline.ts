import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'bench-scenario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<output>{{ value() }}</output>`,
})
export class Scenario {
  protected readonly value = signal('');
}
