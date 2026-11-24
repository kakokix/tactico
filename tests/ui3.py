import sys, time
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/'
errors = []
def shot(page, name): page.screenshot(path=f'tests/out/{name}.png')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(URL)
    page.wait_for_selector('text=Nouvelle carrière')
    page.click('text=Nouvelle carrière'); page.fill('#mgrname', 'Saison'); page.click('text=Choisir mon club')
    page.locator('.cp').nth(0).click(); page.locator('button:has-text("Signer à")').click()
    page.wait_for_selector('.hero')
    t0 = time.time()
    res = page.evaluate("""() => {
      const T = window.__T; let rep = null, n = 0;
      T.G.S.mgr.autoPick = true;
      for (let i = 0; i < 800 && !rep; i++) {
        const r = T.continueGame(T.G.S);
        if (r.stop === 'match' || r.stop === 'matchday') { const sim = T.createSim(T.G.S, r.match, { userAuto: true, quiet: true }); sim.playToEnd(); T.finishUserMatch(T.G.S, r.match, sim); n++; }
        if (r.stop === 'season') rep = r.report;
        for (const m of T.G.S.inbox) if (m.act && !m.done && m.act.type === 'bid') m.done = true;
      }
      T.go('home'); T.openModal('season', { report: rep });
      return { n, user: rep && rep.user, season: T.G.S.season };
    }""")
    print('season sim', round(time.time() - t0, 1), 's', res)
    time.sleep(0.5)
    shot(page, '50_season_modal')
    page.keyboard.press('Escape'); time.sleep(0.3)
    shot(page, '51_new_season_home')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=comps]').click(); page.click('[data-a=cpTab][data-k=hist]'); time.sleep(0.3); shot(page, '52_palmares')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=career]').click(); time.sleep(0.3); shot(page, '53_career')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=inbox]').click(); time.sleep(0.3); shot(page, '54_inbox')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=training]').click(); time.sleep(0.3); shot(page, '55_training')
    b.close()
print('\n'.join(errors) if errors else 'NO ERRORS')
