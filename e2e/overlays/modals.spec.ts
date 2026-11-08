import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { act, openDrawer, openFromList, saved, visit } from './helpers';

const projectMenu = async (page: Page, project: string, item: string) => {
  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: project }).first().hover();
  await nav.getByRole('listitem').filter({ hasText: project }).first().getByRole('button', { name: 'Project options' }).click();
  await page.getByRole('menuitem', { name: item }).click();
};

test('the new task form validates, creates the task with every field, and offers to open it', async ({ page }) => {
  await visit(page);
  await page.getByRole('button', { name: 'New task', exact: true }).first().click();
  const form = page.getByRole('dialog', { name: 'New task' });
  await form.getByRole('button', { name: 'Create task' }).click();
  await expect(form.getByText('Give the task a name')).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Task name' })).toBeFocused();

  await form.getByRole('textbox', { name: 'Task name' }).fill('Plan beta retro');
  await expect(form.getByText('Give the task a name')).toBeHidden();
  await form.getByRole('textbox', { name: 'Description' }).fill('Collect <feedback> & themes');
  await form.getByRole('button', { name: /^Project:/ }).click();
  await page.getByRole('option', { name: 'Mobile App' }).click();
  await form.getByRole('button', { name: 'Status' }).click();
  await page.getByRole('menuitemradio', { name: 'In Progress' }).click();
  await form.getByRole('button', { name: 'Priority' }).click();
  await page.getByRole('menuitemradio', { name: 'High' }).click();
  await form.getByRole('button', { name: 'Assignee' }).click();
  await page.getByRole('option', { name: 'Emma Wilson' }).click();
  await form.getByRole('button', { name: 'Due date' }).click();
  await page.getByRole('button', { name: 'Next week', exact: true }).last().click();
  await form.getByRole('button', { name: 'Start date' }).click();
  await page.getByRole('button', { name: 'Tomorrow', exact: true }).last().click();
  await form.getByRole('button', { name: 'Labels' }).click();
  await page.getByRole('option', { name: 'Research' }).click();
  await page.keyboard.press('Escape');
  await form.getByRole('button', { name: 'Repeat' }).click();
  await page.getByRole('menuitemradio', { name: 'Weekly' }).click();
  const sub = form.getByRole('textbox', { name: 'Add a subtask' });
  await sub.fill('Book a room');
  await sub.press('Enter');
  await sub.fill('Send invites');
  await sub.press('Enter');
  await sub.fill('Order lunch');
  await sub.press('Enter');
  await form.getByRole('button', { name: 'Remove subtask Order lunch' }).click();
  await form.locator('input[type=file]').setInputFiles([
    { name: 'agenda.docx', mimeType: 'application/octet-stream', buffer: Buffer.from('a') },
    { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('b') },
  ]);
  await form.getByRole('button', { name: 'Remove photo.png' }).click();
  await expect(form.getByText('agenda.docx')).toBeVisible();

  await form.getByRole('button', { name: 'Create task' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText(/^Created MOB-\d+ in Mobile App$/)).toBeVisible();
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  const drawer = page.getByRole('dialog', { name: 'Task: Plan beta retro' });
  await expect(drawer.getByRole('button', { name: 'Status: In Progress' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Priority: High' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Assignee: Emma Wilson' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Start date' })).toHaveText('Oct 8');
  await expect(drawer.getByRole('button', { name: 'Labels' })).toHaveText('Research');
  await expect(drawer.getByRole('button', { name: 'Repeat: Weekly' })).toBeVisible();
  await expect(drawer.getByRole('textbox', { name: 'Description' })).toHaveText('Collect <feedback> & themes');
  await expect(drawer.getByRole('button', { name: 'Book a room', exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Order lunch', exact: true })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'agenda.docx', exact: true })).toBeVisible();

  await page.reload();
  const t = (await saved(page)).data.tasks.find((x: { title: string }) => x.title === 'Plan beta retro');
  expect(t).toMatchObject({ project: 'p2', status: 'progress', priority: 'high', assignee: 'm4', start: '2026-10-08', labels: ['research'], recur: 'Weekly' });
  expect((await saved(page)).data.files.some((f: { name: string }) => f.name === 'agenda.docx')).toBe(true);
});

test('Create more keeps the form open for the next task', async ({ page }) => {
  await visit(page);
  await page.keyboard.press('n');
  const form = page.getByRole('dialog', { name: 'New task' });
  await form.getByRole('switch', { name: 'Create more' }).click();
  await form.getByRole('textbox', { name: 'Task name' }).fill('First of many');
  await form.getByRole('textbox', { name: 'Task name' }).press('Enter');
  await expect(page.getByText(/^Created WEB-\d+$/)).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Task name' })).toHaveValue('');
  await expect(form.getByRole('textbox', { name: 'Task name' })).toBeFocused();
  await form.getByRole('textbox', { name: 'Task name' }).fill('Second of many');
  await form.getByRole('textbox', { name: 'Description' }).press('Control+Enter');
  await expect(form).toBeVisible();
  const titles = (await saved(page)).data.tasks.map((x: { title: string }) => x.title);
  expect(titles).toEqual(expect.arrayContaining(['First of many', 'Second of many']));
});

test('Cancel closes the form without creating and returns focus to the button that opened it', async ({ page }) => {
  await visit(page);
  const opener = page.getByRole('button', { name: 'New task', exact: true }).first();
  await opener.click();
  await page.getByRole('dialog', { name: 'New task' }).getByRole('textbox', { name: 'Task name' }).fill('Never mind');
  await page.getByRole('dialog', { name: 'New task' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect((await saved(page)).data.tasks.some((x: { title: string }) => x.title === 'Never mind')).toBe(false);
});

test('editing a task saves its changes with Ctrl+Enter', async ({ page }) => {
  const drawer = await openDrawer(page);
  await drawer.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const form = page.getByRole('dialog', { name: 'Edit task' });
  await expect(form.getByText('MOB-124')).toBeVisible();
  await expect(form.getByRole('switch', { name: 'Create more' })).toHaveCount(0);
  await form.getByRole('textbox', { name: 'Task name' }).fill('Triage beta feedback, round 2');
  await form.getByRole('button', { name: 'Priority' }).click();
  await page.getByRole('menuitemradio', { name: 'Urgent' }).click();
  await form.getByRole('textbox', { name: 'Description' }).fill('Group by theme');
  await form.getByRole('textbox', { name: 'Description' }).press('Control+Enter');
  await expect(form).toBeHidden();
  await expect(page.getByText('Changes saved')).toBeVisible();
  const d = page.getByRole('dialog', { name: 'Task: Triage beta feedback, round 2' });
  await expect(d.getByRole('button', { name: 'Priority: Urgent' })).toBeVisible();
});

test('the new project form validates and creates a project from a template', async ({ page }) => {
  await visit(page);
  await page.keyboard.press('p');
  const form = page.getByRole('dialog', { name: 'New project' });
  await form.getByRole('button', { name: 'Create project' }).click();
  await expect(form.getByText('Give the project a name')).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Project name' })).toBeFocused();

  await form.getByRole('textbox', { name: 'Project name' }).fill('Partner Portal');
  await form.getByRole('textbox', { name: 'Description' }).fill('Self-serve portal for partners');
  await form.getByRole('radio', { name: 'Website' }).click();
  await expect(form.getByRole('radio', { name: 'globe' })).toHaveAttribute('aria-checked', 'true');
  await form.getByRole('radio', { name: 'teal' }).click();
  await form.getByRole('combobox', { name: 'Team' }).click();
  await page.getByRole('option', { name: 'Engineering' }).click();
  await form.getByRole('combobox', { name: 'Lead' }).click();
  await page.getByRole('option', { name: 'John Carter' }).click();
  await form.getByRole('button', { name: 'Create project' }).click();

  await expect(form).toBeHidden();
  await expect(page.getByText('Created Partner Portal with 6 starter tasks')).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/p[a-z0-9]+\/board$/);
  const p = (await saved(page)).data.projects.find((x: { name: string }) => x.name === 'Partner Portal');
  expect(p).toMatchObject({ icon: 'globe', color: 'teal', team: 'eng', lead: 'm3', desc: 'Self-serve portal for partners' });
});

test('project settings edit the project', async ({ page }) => {
  await visit(page);
  await projectMenu(page, 'Mobile App', 'Rename & edit');
  const form = page.getByRole('dialog', { name: 'Project settings' });
  await expect(form.getByRole('textbox', { name: 'Project name' })).toHaveValue('Mobile App');
  await expect(form.getByRole('radiogroup', { name: 'Template' })).toHaveCount(0);
  await form.getByRole('textbox', { name: 'Project name' }).fill('Mobile App 2.0');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Project updated')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByText('Mobile App 2.0')).toBeVisible();
});

test('sharing adds members, invites by email, changes and removes access, and sets general access', async ({ page }) => {
  await visit(page);
  await projectMenu(page, 'Design System', 'Share');
  const share = page.getByRole('dialog', { name: 'Share “Design System”' });
  const input = share.getByRole('textbox', { name: 'Invite by email' });
  await expect(input).toBeFocused();

  await input.fill('lena');
  await share.getByRole('button', { name: /Lena Fischer/ }).click();
  await expect(page.getByText('Lena Fischer can now edit Design System')).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(share.getByRole('combobox', { name: 'Permission for Lena Fischer' })).toContainText('Can edit');

  await input.fill('not-an-email');
  await expect(share.getByText('No matching members — enter an email to invite someone new')).toBeVisible();
  await share.getByRole('button', { name: 'Invite', exact: true }).click();
  await expect(page.getByText('Enter a valid email address, like name@company.com')).toBeVisible();

  await input.fill('dana.lee@acme.com');
  await share.getByRole('combobox', { name: 'Permission', exact: true }).click();
  await page.getByRole('option', { name: 'Can comment' }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.press('Enter');
  await expect(page.getByText('Invitation sent to dana.lee@acme.com')).toBeVisible();
  await expect(share.getByText('Dana Lee')).toBeVisible();
  await expect(share.getByRole('combobox', { name: 'Permission for Dana Lee' })).toContainText('Can comment');

  await share.getByRole('combobox', { name: 'Permission for Lena Fischer' }).click();
  await page.getByRole('option', { name: 'Can view' }).click();
  await expect(page.getByText('Lena Fischer: Can view')).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await share.getByRole('combobox', { name: 'Permission for Dana Lee' }).click();
  await page.getByRole('option', { name: 'Remove access' }).click();
  await expect(page.getByText('Removed Dana Lee')).toBeVisible();
  await expect(share.getByText('Dana Lee')).toHaveCount(0);
  await expect(page.getByRole('listbox')).toHaveCount(0);

  await share.getByRole('combobox', { name: 'General access' }).click();
  await page.getByRole('option', { name: 'Only people invited' }).click();
  await expect(share.getByText('Only people listed above can open this project.')).toBeVisible();
  await share.getByRole('button', { name: 'Done' }).click();
  await expect(share).toBeHidden();

  await page.reload();
  const p = (await saved(page)).data.projects.find((x: { name: string }) => x.name === 'Design System');
  const lena = (await saved(page)).data.members.find((m: { name: string }) => m.name === 'Lena Fischer');
  expect(p.access).toBe('private');
  expect(p.perms[lena.id]).toBe('Can view');
  expect(p.members).toContain(lena.id);
});

test('inviting validates the addresses, then sends', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await visit(page);
  await page.getByRole('button', { name: 'Invite member' }).first().click();
  const form = page.getByRole('dialog', { name: /^Invite to / });
  await form.getByRole('button', { name: 'Copy invite link' }).click();
  await expect(page.getByText('Invite link copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL('/signup?invite=cairn', page.url()).href);

  await form.getByRole('button', { name: 'Send invites' }).click();
  await expect(form.getByText('Enter at least one email address')).toBeVisible();
  await form.getByRole('textbox', { name: 'Email addresses' }).fill('ana@acme.com, bogus');
  await form.getByRole('button', { name: 'Send invites' }).click();
  await expect(form.getByText("bogus isn't a valid email address")).toBeVisible();
  await form.getByRole('textbox', { name: 'Email addresses' }).fill('ana@acme.com, raj@acme.com');
  await form.getByRole('combobox', { name: 'Role' }).click();
  await page.getByRole('option', { name: 'Guest' }).click();
  await form.getByRole('button', { name: 'Send invites' }).click();
  await expect(page.getByText('2 invitations sent')).toBeVisible();
  await expect(form).toBeHidden();
  const invited = (await saved(page)).data.members.filter((m: { status: string; role: string }) => m.status === 'invited' && m.role === 'Guest');
  expect(invited.map((m: { email: string }) => m.email)).toEqual(expect.arrayContaining(['ana@acme.com', 'raj@acme.com']));
});

test('deleting a task asks first; Cancel keeps it and Delete removes it with undo', async ({ page }) => {
  const drawer = await openDrawer(page);
  const ask = async () => {
    await drawer.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    return page.getByRole('alertdialog', { name: 'Delete task?' });
  };
  let confirm = await ask();
  await expect(confirm.getByText('Triage beta tester feedback')).toBeVisible();
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(drawer).toBeVisible();

  confirm = await ask();
  await confirm.getByRole('button', { name: 'Delete task' }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByText('Deleted “Triage beta tester feedback”')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Triage beta tester feedback', exact: true }).first()).toBeVisible();
});

test('a confirm that needs the name typed keeps its button disabled until it matches', async ({ page }) => {
  await visit(page);
  await projectMenu(page, 'Customer Portal', 'Delete project');
  const confirm = page.getByRole('alertdialog', { name: 'Delete Customer Portal?' });
  const ok = confirm.getByRole('button', { name: 'Delete project' });
  await expect(ok).toBeDisabled();
  await confirm.getByRole('textbox', { name: 'Type Customer Portal to confirm' }).fill('Customer');
  await expect(ok).toBeDisabled();
  await confirm.getByRole('textbox', { name: 'Type Customer Portal to confirm' }).fill('Customer Portal');
  await ok.click();
  await expect(page.getByText('Deleted Customer Portal')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByText('Customer Portal')).toHaveCount(0);
});

test('a prompt resolves with the entered text, or null when dismissed', async ({ page }) => {
  await visit(page);
  await act(page, s => s.prompt({ title: 'Rename view', label: 'View name', value: 'Sprint' }).then(v => sessionStorage.setItem('prompt', String(v))));
  const dlg = page.getByRole('dialog', { name: 'Rename view' });
  await expect(dlg.getByRole('textbox', { name: 'View name' })).toHaveValue('Sprint');
  await dlg.getByRole('textbox', { name: 'View name' }).fill('  Sprint 42 ');
  await dlg.getByRole('textbox', { name: 'View name' }).press('Enter');
  await expect(dlg).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem('prompt'))).toBe('Sprint 42');

  await act(page, s => s.prompt({ title: 'Rename view', label: 'View name', value: 'x', ok: 'Rename' }).then(v => sessionStorage.setItem('prompt', String(v))));
  await expect(page.getByRole('dialog', { name: 'Rename view' }).getByRole('button', { name: 'Rename' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('prompt'))).toBe('null');
});

test('stacked dialogs close from the top, and each settles its own promise', async ({ page }) => {
  await visit(page);
  await page.getByRole('button', { name: 'Invite member' }).first().click();
  const invite = page.getByRole('dialog', { name: /^Invite to / });
  await expect(invite.getByRole('textbox', { name: 'Email addresses' })).toBeFocused();
  await act(page, s =>
    s
      .confirm({ title: 'Discard invites?', body: ['You typed ', { b: 'two' }, ' addresses.'], ok: 'Discard' })
      .then(v => sessionStorage.setItem('confirm', String(v))),
  );
  const confirm = page.getByRole('alertdialog', { name: 'Discard invites?' });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await expect(confirm.locator('b')).toHaveText('two');

  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  await expect(invite).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('confirm'))).toBe('false');
  await page.keyboard.press('Escape');
  await expect(invite).toBeHidden();
});

test('the shortcuts dialog lists every group and closes from its button', async ({ page }) => {
  await visit(page);
  await page.keyboard.press('Shift+?');
  const dlg = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  for (const group of ['General', 'Create', 'Navigate', 'Command menu']) await expect(dlg.getByText(group, { exact: true }).first()).toBeVisible();
  await expect(dlg.getByText('then')).toHaveCount(6);
  await dlg.getByRole('button', { name: 'Close' }).click();
  await expect(dlg).toBeHidden();
});

test('the team dialog frame hosts the team form', async ({ page }) => {
  await visit(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'New team' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
});

test('a copied project link opens the project', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await visit(page);
  await projectMenu(page, 'Mobile App', 'Copy link');
  await expect(page.getByText('Link copied')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toBe(new URL('/projects/p2', page.url()).href);
  await page.goto(link);
  await expect(page).toHaveURL(/\/projects\/p2\/board$/);
});

test('a file preview shows the file and links to its task', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const drawer = await openFromList(page, 'Create homepage wireframes');
  await drawer.getByRole('button', { name: 'nav-audit-findings.pdf', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'nav-audit-findings.pdf' });
  await expect(dlg.getByText(/^PDF · 860 KB · Uploaded by Sarah Chen/)).toBeVisible();
  await dlg.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByText('Link copied')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toBe(new URL('/projects/p1/files?file=a2', page.url()).href);
  await dlg.getByRole('button', { name: 'Create homepage wireframes' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Task: Create homepage wireframes' })).toBeVisible();

  await page.goto(link);
  await expect(page).toHaveURL(/\/projects\/p1\/files$/);
  await expect(page.getByRole('dialog', { name: 'nav-audit-findings.pdf' })).toBeVisible();
});

test('saving a view adds a tab with the chosen layout', async ({ page }) => {
  await visit(page, '/projects/p1/list');
  await act(page, s => s.openModal({ type: 'saveView', pid: 'p1' as never, nf: 0 }));
  const dlg = page.getByRole('dialog', { name: 'Save view' });
  await expect(dlg.getByText('No filters are active')).toBeVisible();
  await dlg.getByRole('textbox', { name: 'View name' }).fill('Design queue');
  await dlg.getByRole('combobox', { name: 'Layout' }).click();
  await page.getByRole('option', { name: 'Board' }).click();
  await dlg.getByRole('button', { name: 'Save view' }).click();
  await expect(page.getByText('Saved view “Design queue”')).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/p1\/v%3Av[a-z0-9]+$/);
  const v = (await saved(page)).data.savedViews.find((x: { name: string }) => x.name === 'Design queue');
  expect(v).toMatchObject({ project: 'p1', type: 'board', filters: [] });
});
