import sys, time
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 10
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
    page.click('text=Classement mondial'); time.sleep(0.3); shot(page, '30_title_board'); page.keyboard.press('Escape')
    page.click('text=Nouvelle carrière'); page.fill('#mgrname', 'Testeur'); page.click('text=Choisir mon club')
    page.click('[data-a=pickLvl][data-l="2"]'); time.sleep(0.2)
    page.locator('.cp').nth(3).click(); page.locator('button:has-text("Signer à")').click()
    page.wait_for_selector('.hero')
    played = 0; msgs = 0
    t0 = time.time()
    while played < N and time.time() - t0 < 240:
        if page.locator('.modal').count():
            txt = page.locator('.modal h2').first.inner_text()
            msgs += 1
            if msgs <= 3: shot(page, f'31_msg_{msgs}')
            if page.locator('[data-a=bidReject]').count(): page.click('[data-a=bidReject]')
            elif page.locator('[data-a=postDone]').count(): page.click('[data-a=postDone]')
            else: page.keyboard.press('Escape')
            time.sleep(0.15); continue
        if page.locator('[data-a=playQuick]').count():
            page.click('[data-a=playQuick]'); time.sleep(0.3); played += 1; continue
        page.locator('button.go').first.click(); time.sleep(0.25)
    for _ in range(5):
        if page.locator('[data-a=postDone]').count(): page.click('[data-a=postDone]')
        elif page.locator('.modal').count(): page.keyboard.press('Escape')
        time.sleep(0.2)
    print('played', played, 'msgs', msgs, 'time', round(time.time() - t0, 1))
    shot(page, '32_home_later')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=inbox]').click(); time.sleep(0.3); shot(page, '33_inbox')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=fixtures]').click(); time.sleep(0.3); shot(page, '34_fixtures')
    page.locator('.main [data-a=matchReport]').first.click(); time.sleep(0.3); shot(page, '35_report'); page.keyboard.press('Escape')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=comps]').click(); page.click('[data-a=cpTab][data-k=stats]'); time.sleep(0.3); shot(page, '36_stats')
    page.click('[data-a=cpTab][data-k=conti]'); time.sleep(0.3); shot(page, '37_conti')
    page.click('[data-a=cpTab][data-k=cup]'); time.sleep(0.3); shot(page, '38_cup')
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=finances]').click(); time.sleep(0.3); shot(page, '39_fin')
    page.locator('.bnav [data-s=transfers]').click(); time.sleep(0.3); shot(page, '40_market')
    # rechargement : la sauvegarde doit revenir
    page.reload(); page.wait_for_selector('text=Continuer :', timeout=10000); shot(page, '41_reload_title')
    page.click('[data-a=loadCareer]'); page.wait_for_selector('.hero, .main'); time.sleep(0.4); shot(page, '42_reloaded')
    b.close()
print('\n'.join(errors) if errors else 'NO ERRORS')
