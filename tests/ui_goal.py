# Capture les temps forts de l'animation (but, arrêt, corner...) pendant un match en direct.
import sys, time
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/'
CLUB = sys.argv[1] if len(sys.argv) > 1 else 'Paris Saint-Germain'
CC = sys.argv[2] if len(sys.argv) > 2 else 'FR'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    page = b.new_context(viewport={'width': 1100, 'height': 760}).new_page()
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(URL)
    page.wait_for_selector('text=Nouvelle carrière')
    page.click('text=Nouvelle carrière'); page.fill('#mgrname', 'Testeur'); page.click('text=Choisir mon club')
    page.wait_for_selector('.cp'); page.locator(f'[data-a=pickCountry][data-c={CC}]').click(); page.wait_for_timeout(300); page.locator('.cp', has_text=CLUB).first.click()
    page.wait_for_selector('.sheet'); page.locator('button:has-text("Signer à")').click()
    page.wait_for_selector('.hero')
    for i in range(30):
        if page.locator('button.go.match').count(): break
        if page.locator('.modal').count(): page.keyboard.press('Escape'); time.sleep(0.2)
        page.locator('button.go').first.click(); page.wait_for_timeout(500)
    page.locator('button.go').first.click(); page.wait_for_selector('text=Jouer en direct'); page.click('text=Jouer en direct')
    page.wait_for_selector('#lv-canvas')
    page.locator('[data-a=lvSpeed][data-v="2"]').click()
    seen = {}
    t0 = time.time()
    while time.time() - t0 < 75 and len(seen) < 9:
        txt = page.evaluate("() => (window.__anim && window.__anim.banners || []).map(b => b.text).join('|')")
        for key in ['BUT !', 'ARRÊT', 'CORNER', 'HORS-JEU', 'POTEAU', 'COUP FRANC', 'PENALTY', 'VAR', 'CARTON']:
            if key in txt and key not in seen:
                seen[key] = 1
                time.sleep(0.25)
                page.screenshot(path=f'tests/out/G_{key.replace(" ", "_").replace("!", "")}.png')
        if page.locator('[data-a=htTalk]').count():
            page.locator('[data-a=htTalk]').first.click()
        elif page.locator('[data-a=lvDone]').count():
            break
        time.sleep(0.12)
    print('captures', list(seen))
    b.close()
print('\n'.join(errors) if errors else 'aucune erreur')
