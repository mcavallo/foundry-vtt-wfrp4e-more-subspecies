export class DebouncedCallback<A extends any[]> {
  private timeout?: ReturnType<typeof setTimeout> = undefined;

  constructor(
    private callback: (...args: A) => void,
    private delay: number
  ) {}

  run(...args: A) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.callback(...args), this.delay);
  }
}
