import time
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/'
errors = []; toasts = []
def shot(page, name): page.screenshot(path=f'tests/out/{name}.png')
def last_toast(page):
    t = page.locator('.toast')
    return t.last.inner_text() if t.count() else ''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(URL); page.wait_for_selector('text=Nouvelle carrière')
    page.click('text=Nouvelle carrière'); page.fill('#mgrname', 'Mercato'); page.click('text=Choisir mon club')
    page.locator('.cp').nth(2).click(); page.locator('button:has-text("Signer à")').click(); page.wait_for_selector('.hero')
    page.evaluate("() => { const S = window.__T.G.S; const c = S.clubs[S.user]; c.tBudget = 60e6; c.wBudget += 400000; window.__T.render(); }")
    # Joueur libre
    page.locator('.bnav [data-s=transfers]').click(); page.click('[data-a=mkTab][data-k=free]'); time.sleep(0.2)
    page.locator('.main .list .li').first.click(); time.sleep(0.2)
    page.click('text=Proposer un contrat'); time.sleep(0.2); shot(page, '60_contract')
    page.click('[data-a=contractSend]'); time.sleep(0.3); print('free agent:', last_toast(page))
    # Offre de transfert
    page.click('[data-a=mkTab][data-k=search]'); time.sleep(0.2)
    page.select_option('select[data-k=sort]', 'value'); time.sleep(0.3)
    page.locator('.main .list .li').nth(3).click(); time.sleep(0.2)
    page.click('text=Faire une offre'); time.sleep(0.2)
    page.locator('[data-a=bidSet]').nth(3).click(); time.sleep(0.1)
    page.click('[data-a=bidSend]'); time.sleep(0.3); shot(page, '61_after_bid')
    if page.locator('[data-a=contractSend]').count():
        page.click('[data-a=contractSend]'); time.sleep(0.3)
    print('transfer:', last_toast(page), '| modal:', page.locator('.modal .note').first.inner_text() if page.locator('.modal .note').count() else '-')
    page.keyboard.press('Escape'); page.keyboard.press('Escape'); time.sleep(0.2)
    # Prolongation + prêt + libération
    page.locator('.bnav [data-s=squad]').click(); time.sleep(0.2)
    page.locator('.only-m .li').nth(2).click(); time.sleep(0.2)
    page.click('text=Prolonger le contrat'); time.sleep(0.2)
    page.locator('[data-a=wageSet]').nth(3).click(); page.click('[data-a=contractSend]'); time.sleep(0.3); print('renew:', last_toast(page))
    page.keyboard.press('Escape'); page.keyboard.press('Escape')
    page.select_option('select[data-ch=sqSort]', 'age'); time.sleep(0.2)
    page.locator('.only-m .li').first.click(); time.sleep(0.2)
    page.click('text=Prêter'); time.sleep(0.2); shot(page, '62_loan')
    if page.locator('[data-a=loanOutGo]').count(): page.locator('[data-a=loanOutGo]').first.click(); time.sleep(0.3)
    print('loan out:', last_toast(page))
    page.locator('.only-m .li').last.click(); time.sleep(0.2)
    page.locator('[data-a=releaseAsk]').click(); time.sleep(0.2); page.locator('[data-a=releaseGo]').click(); time.sleep(0.3); print('release:', last_toast(page))
    # Tactique : changement de formation + choix d'un joueur
    page.locator('.bnav [data-s=tactics]').click(); time.sleep(0.2)
    page.click('[data-a=formation][data-f="3-5-2"]'); time.sleep(0.2)
    page.locator('.tok').nth(5).click(); time.sleep(0.2)
    page.locator('[data-a=slotPick]').nth(1).click(); time.sleep(0.2); shot(page, '63_tactics_352')
    page.select_option('select[data-ch=benchAdd]', index=1); time.sleep(0.2)
    # Entraînement + finances
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=training]').click(); page.click('[data-a=trainFocus][data-k=att]'); page.click('[data-a=trainInt][data-v="2"]'); time.sleep(0.2)
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=finances]').click(); time.sleep(0.2)
    page.locator('[data-a=budgetShift][data-v="1"]').click(); time.sleep(0.2)
    if page.locator("[data-a=facUp]:not([disabled])").count(): page.locator("[data-a=facUp]:not([disabled])").first.click(); time.sleep(0.2)
    print('fac:', last_toast(page))
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=club]').click(); page.locator('[data-a=delegate][data-k=renew]').click(); time.sleep(0.2)
    page.locator('.bnav [data-s=more]').click(); page.locator('.main [data-s=options]').click(); page.click('[data-a=saveNow]'); time.sleep(0.4); print('save:', last_toast(page))
    print('squad size:', page.evaluate("() => { const S = window.__T.G.S; return S.clubs[S.user].squad.length; }"))
    b.close()
print('\n'.join(errors) if errors else 'NO ERRORS')
