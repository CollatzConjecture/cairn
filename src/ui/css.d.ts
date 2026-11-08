import 'react';

declare module 'react' {
  interface CSSProperties {
    /** Custom properties set inline, such as `--c` (a data colour the `text-tint`, `avatar-tint` and `bg-(--c)` utilities read). */
    [key: `--${string}`]: string | number | undefined;
  }
}
