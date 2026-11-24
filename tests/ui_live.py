# Test navigateur : monde réel, match en direct (animation), captures successives.
import sys, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
CLUB = sys.argv[2] if len(sys.argv) > 2 else 'Paris Saint-Germain'
errors = []
def shot(page, name):
    page.screenshot(path=f'tests/out/{name}.png', full_page=False)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 860}, device_scale_factor=1)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(URL)
    page.wait_for_selector('text=Nouvelle carrière', timeout=15000)
    page.click('text=Nouvelle carrière')
    page.fill('#mgrname', 'Testeur')
    shot(page, 'L00_profile')
    page.click('text=Choisir mon club')
    page.wait_for_selector('.cp')
    shot(page, 'L01_clubs')
    page.locator('.cp', has_text=CLUB).first.click()
    page.wait_for_selector('.sheet')
    page.locator('button:has-text("Signer à")').click()
    page.wait_for_selector('.hero', timeout=15000)
    for i in range(30):
        if page.locator('button.go.match').count():
            break
        if page.locator('.modal').count():
            page.keyboard.press('Escape')
            time.sleep(0.2)
        page.locator('button.go').first.click()
        page.wait_for_timeout(600)
    page.locator('button.go').first.click()
    page.wait_for_selector('text=Jouer en direct', timeout=10000)
    page.click('text=Jouer en direct')
    page.wait_for_selector('#lv-canvas')
    t0 = time.time()
    for k in range(14):
        time.sleep(0.9)
        shot(page, f'L1{k:02d}_live')
    page.locator('[data-a=lvSpeed][data-v="4"]').click()
    for k in range(6):
        time.sleep(2.5)
        shot(page, f'L2{k:02d}_fast')
        if page.locator('.modal').count():
            shot(page, 'L3_halftime')
            page.locator('[data-a=htTalk]').first.click()
            time.sleep(0.5)
    page.locator('[data-a=lvEnd]').click()
    time.sleep(1.5)
    shot(page, 'L4_end')
    print('feed lines', page.locator('.fe').count())
    b.close()
print('\n'.join(errors) if errors else 'aucune erreur')
