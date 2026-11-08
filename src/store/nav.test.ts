import { describe, expect, it } from 'vitest';
import { hrefOf, routeOf } from './nav';

describe('routes', () => {
  it.each([
    ['/home', { r: 'home' }],
    ['/my-tasks', { r: 'mytasks' }],
    ['/design-system', { r: 'system' }],
    ['/members/m2', { r: 'member', id: 'm2' }],
    ['/teams/design', { r: 'team', id: 'design' }],
    ['/projects/p1/board', { r: 'project', id: 'p1', tab: 'board' }],
    ['/projects/p1/v%3Av1', { r: 'project', id: 'p1', tab: 'v:v1' }],
    ['/settings/notif-email', { r: 'settings', sec: 'notif-email' }],
    ['/forgot/sent', { r: 'forgot-sent' }],
    ['/onboarding/5', { r: 'onboarding', step: 5 }],
  ])('%s is %o and maps back', (path, route) => {
    const r = routeOf(path);
    expect(r).toEqual(route);
    expect(r && routeOf(hrefOf(r))).toEqual(route);
  });

  it.each(['/nope', '/projects/p1/nope', '/onboarding/6', '/members/m2/x', '/'])('%s is not a page', path => {
    expect(routeOf(path)).toBeNull();
  });
});
